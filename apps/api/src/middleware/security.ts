import type { Hono } from "hono";
import type { Env } from "hono/types";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";

export function applySecurityMiddleware<E extends Env>(app: Hono<E>) {
  app.use(
    "*",
    secureHeaders({
      xFrameOptions: "DENY",
      xContentTypeOptions: "nosniff",
      strictTransportSecurity: "max-age=31536000; includeSubDomains",
      referrerPolicy: "strict-origin-when-cross-origin",
    })
  );

  const origins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    "*",
    cors({
      origin: origins,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      maxAge: 86400,
    })
  );

  app.use("*", async (c, next) => {
    const contentLength = c.req.header("content-length");
    if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
      return c.json({ error: "Payload too large" }, 413);
    }
    await next();
  });
}
