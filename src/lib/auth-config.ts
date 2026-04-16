import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: "owner" | "super_admin" | "partner";
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "dev-secret-must-be-at-least-32-characters-long",
  cookieName: "backstage-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

// Only these emails can log in
export const ALLOWED_EMAILS = [
  "murdo@bar-excellence.app",
  "rob@roberthayford.com",
  "rory@lc-group.com",
] as const;
