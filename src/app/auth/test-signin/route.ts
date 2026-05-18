import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ALLOWED_EMAILS } from "@/lib/auth-config";
import { createSession } from "@/lib/session";

function isTestAuthEnabled(): boolean {
  if (process.env.ENABLE_TEST_AUTH !== "true") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return true;
}

export async function GET(request: NextRequest) {
  if (!isTestAuthEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const email = request.nextUrl.searchParams.get("email");
  const redirectTo = request.nextUrl.searchParams.get("redirect") ?? "/";

  if (!email || !ALLOWED_EMAILS.includes(email as (typeof ALLOWED_EMAILS)[number])) {
    return new NextResponse("Invalid email", { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    return new NextResponse("User not seeded", { status: 404 });
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
