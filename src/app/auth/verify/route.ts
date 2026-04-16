import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAndCreateSession } from "@/actions/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=missing-token", request.url)
    );
  }

  const result = await verifyAndCreateSession(token);

  if (result.error) {
    return NextResponse.redirect(
      new URL(
        `/auth/signin?error=${encodeURIComponent(result.error)}`,
        request.url
      )
    );
  }

  return NextResponse.redirect(new URL(result.redirect || "/", request.url));
}
