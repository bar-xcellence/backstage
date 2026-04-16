import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionOptions } from "./auth-config";
import type { SessionData } from "./auth-config";

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );
  if (!session.isLoggedIn) return null;
  return session;
}

export async function createSession(
  data: Omit<SessionData, "isLoggedIn">
): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );
  session.userId = data.userId;
  session.email = data.email;
  session.name = data.name;
  session.role = data.role;
  session.isLoggedIn = true;
  await session.save();
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );
  session.destroy();
}

// Eng Review Issue 5A: DRY role-checking helper
export async function requireRole(
  ...allowedRoles: SessionData["role"][]
): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    redirect("/auth/signin");
  }
  if (!allowedRoles.includes(session.role)) {
    throw new Error("Forbidden: insufficient permissions");
  }
  return session;
}
