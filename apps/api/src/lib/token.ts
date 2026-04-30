import { sign, verify } from "hono/jwt";

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TTL = 15 * 60;
const REFRESH_TTL = 7 * 24 * 60 * 60;

export async function signAccessToken(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: userId, exp: now + ACCESS_TTL, iat: now }, ACCESS_SECRET);
}

export async function signRefreshToken(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: userId, type: "refresh", exp: now + REFRESH_TTL, iat: now }, REFRESH_SECRET);
}

export async function verifyAccessToken(token: string) {
  return verify(token, ACCESS_SECRET) as Promise<{ sub: string; exp: number; iat: number }>;
}

export async function verifyRefreshToken(token: string) {
  const payload = (await verify(token, REFRESH_SECRET)) as {
    sub: string;
    type: string;
    exp: number;
  };
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  return payload;
}
