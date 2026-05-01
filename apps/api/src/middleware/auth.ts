import { createMiddleware } from "hono/factory";
import { verifyAccessToken } from "../lib/token";

export type AuthEnv = { Variables: { userId: string } };

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const payload = await verifyAccessToken(auth.slice(7));
    c.set("userId", payload.sub);
    await next();
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
});
