import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../db/index";
import { users, categories } from "../db/schema";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/token";
import { sendVerificationEmail } from "../lib/email";
import { rateLimit } from "../middleware/rateLimit";

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MS = 30 * 60 * 1000;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

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

// Generate once at startup to avoid timing leak on login
const dummyHashPromise = hashPassword("__ctrl_custo_dummy__");

function generateVerificationToken() {
  return randomBytes(32).toString("hex");
}

async function seedDefaultCategories(userId: string) {
  const defaults = [
    { name: "Alimentação", type: "expense" as const, icon: "🍽️", color: "#F97316" },
    { name: "Transporte", type: "expense" as const, icon: "🚗", color: "#06B6D4" },
    { name: "Moradia", type: "expense" as const, icon: "🏠", color: "#6366F1" },
    { name: "Saúde", type: "expense" as const, icon: "💊", color: "#EF4444" },
    { name: "Educação", type: "expense" as const, icon: "📚", color: "#3B82F6" },
    { name: "Lazer", type: "expense" as const, icon: "🎬", color: "#EC4899" },
    { name: "Compras", type: "expense" as const, icon: "🛒", color: "#F59E0B" },
    { name: "Vestuário", type: "expense" as const, icon: "👗", color: "#84CC16" },
    { name: "Assinaturas", type: "expense" as const, icon: "📱", color: "#6B7280" },
    { name: "Contas & Utilidades", type: "expense" as const, icon: "⚡", color: "#10B981" },
    { name: "Salário", type: "income" as const, icon: "💰", color: "#16A34A" },
    { name: "Freelance", type: "income" as const, icon: "💻", color: "#8B5CF6" },
    { name: "Investimentos", type: "income" as const, icon: "📈", color: "#2563EB" },
    { name: "Presentes", type: "income" as const, icon: "🎁", color: "#DB2777" },
    { name: "Outros", type: "both" as const, icon: "❓", color: "#6B7280" },
  ];
  await db.insert(categories).values(defaults.map((cat) => ({ ...cat, userId })));
}

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
    return c.json({ error: "E-mail já cadastrado." }, 409);
  }

  const [passwordHash, verificationToken] = await Promise.all([
    hashPassword(password),
    Promise.resolve(generateVerificationToken()),
  ]);
  const verificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: verificationExpiresAt,
    })
    .returning({ id: users.id });

  seedDefaultCategories(newUser.id).catch((err) => {
    console.error("[auth] failed to seed default categories:", err);
  });

  await sendVerificationEmail(email, verificationToken).catch((err) => {
    console.error("[auth] failed to send verification email:", err);
  });

  return c.json({ message: "Conta criada. Verifique seu e-mail para ativar a conta." }, 201);
});

authRouter.post("/login", zValidator("json", authBody), async (c) => {
  const { email, password } = c.req.valid("json");

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    await verifyPassword(await dummyHashPromise, password);
    return c.json({ error: "E-mail ou senha incorretos." }, 401);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return c.json(
      { error: "Conta bloqueada temporariamente. Tente novamente em 30 minutos." },
      423
    );
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const newFailed = user.failedAttempts + 1;
    const lockedUntil = newFailed >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;
    await db
      .update(users)
      .set({ failedAttempts: newFailed, lockedUntil, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    return c.json({ error: "E-mail ou senha incorretos." }, 401);
  }

  if (!user.emailVerified) {
    return c.json(
      {
        error: "E-mail não verificado. Verifique sua caixa de entrada.",
        code: "EMAIL_NOT_VERIFIED",
      },
      403
    );
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

authRouter.get("/verify-email", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ error: "Token inválido" }, 400);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1);

  if (!user) return c.json({ error: "Token inválido ou expirado" }, 400);

  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
    return c.json({ error: "Token expirado. Solicite um novo e-mail de verificação." }, 400);
  }

  await db
    .update(users)
    .set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id),
    signRefreshToken(user.id),
  ]);

  setCookie(c, REFRESH_COOKIE, refreshToken, cookieOpts);
  return c.json({ accessToken });
});

authRouter.post(
  "/resend-verification",
  zValidator("json", z.object({ email: z.string().email().max(255) })),
  async (c) => {
    const { email } = c.req.valid("json");

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // Always respond with 200 to avoid email enumeration
    if (!user || user.emailVerified) {
      return c.json({ ok: true });
    }

    const verificationToken = generateVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

    await db
      .update(users)
      .set({
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: verificationExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await sendVerificationEmail(email, verificationToken).catch((err) => {
      console.error("[auth] failed to resend verification email:", err);
    });

    return c.json({ ok: true });
  }
);

authRouter.post("/refresh", async (c) => {
  const token = getCookie(c, REFRESH_COOKIE);
  if (!token) return c.json({ error: "Não autorizado." }, 401);

  try {
    const payload = await verifyRefreshToken(token);
    const accessToken = await signAccessToken(payload.sub);
    return c.json({ accessToken });
  } catch {
    deleteCookie(c, REFRESH_COOKIE, { path: "/" });
    return c.json({ error: "Não autorizado." }, 401);
  }
});

authRouter.post("/logout", (c) => {
  deleteCookie(c, REFRESH_COOKIE, { path: "/" });
  return c.json({ ok: true });
});
