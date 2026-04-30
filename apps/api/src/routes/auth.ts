import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { users } from "../db/schema";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/token";
import { rateLimit } from "../middleware/rateLimit";

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MS = 30 * 60 * 1000;

const authBody = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

const REFRESH_COOKIE = "refresh_token";
const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Lax" as const,
  maxAge: 7 * 24 * 60 * 60,
  path: "/",
};

export const authRouter = new Hono();

authRouter.use("*", rateLimit(10, 15 * 60 * 1000));

authRouter.post("/register", zValidator("json", authBody), async (c) => {
  const { email, password } = c.req.valid("json");

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email, passwordHash }).returning({ id: users.id });

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id),
    signRefreshToken(user.id),
  ]);

  setCookie(c, REFRESH_COOKIE, refreshToken, cookieOpts);
  return c.json({ accessToken }, 201);
});

authRouter.post("/login", zValidator("json", authBody), async (c) => {
  const { email, password } = c.req.valid("json");

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return c.json({ error: "Account temporarily locked. Try again later." }, 423);
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const newFailed = user.failedAttempts + 1;
    const lockedUntil = newFailed >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;
    await db
      .update(users)
      .set({ failedAttempts: newFailed, lockedUntil, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    return c.json({ error: "Invalid credentials" }, 401);
  }

  if (user.failedAttempts > 0) {
    await db
      .update(users)
      .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id),
    signRefreshToken(user.id),
  ]);

  setCookie(c, REFRESH_COOKIE, refreshToken, cookieOpts);
  return c.json({ accessToken });
});

authRouter.post("/refresh", async (c) => {
  const token = getCookie(c, REFRESH_COOKIE);
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  try {
    const payload = await verifyRefreshToken(token);
    const accessToken = await signAccessToken(payload.sub);
    return c.json({ accessToken });
  } catch {
    deleteCookie(c, REFRESH_COOKIE, { path: "/" });
    return c.json({ error: "Unauthorized" }, 401);
  }
});

authRouter.post("/logout", (c) => {
  deleteCookie(c, REFRESH_COOKIE, { path: "/" });
  return c.json({ ok: true });
});
