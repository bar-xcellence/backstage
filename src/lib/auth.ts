import { SignJWT, jwtVerify } from "jose";
import { ALLOWED_EMAILS } from "./auth-config";

// ── Magic Link Token ───────────────────────────────────

export async function createMagicLinkToken(
  email: string,
  secret: string,
  expiresIn: string = "15m"
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifyMagicLinkToken(
  token: string,
  secret: string
): Promise<{ email: string }> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return { email: payload.email as string };
}

// ── Email Validation ───────────────────────────────────

export function isAllowedEmail(email: string): boolean {
  return (ALLOWED_EMAILS as readonly string[]).includes(
    email.toLowerCase().trim()
  );
}
