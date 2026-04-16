"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import {
  createMagicLinkToken,
  verifyMagicLinkToken,
  isAllowedEmail,
} from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLink(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = (formData.get("email") as string)?.toLowerCase().trim();

  if (!email) {
    return { error: "Email is required" };
  }

  if (!isAllowedEmail(email)) {
    // Security: don't reveal whether the email exists
    return { success: true };
  }

  try {
    const token = await createMagicLinkToken(
      email,
      process.env.MAGIC_LINK_SECRET!
    );
    const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;

    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: email,
      subject: "Sign in to Backstage",
      html: `
        <div style="font-family: 'Raleway', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #FAF9F6;">
          <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; color: #1E1F2E; font-size: 28px; margin-bottom: 8px; letter-spacing: -0.02em;">Backstage</h1>
          <p style="font-family: 'Raleway', Arial, sans-serif; font-size: 10px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: #6B7280; margin-bottom: 32px;">Bar Excellence Events</p>
          <p style="color: #7A5416; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">Click the button below to sign in. This link expires in 15 minutes.</p>
          <a href="${magicLink}" style="display: inline-block; padding: 14px 36px; background: #A4731E; color: #FAF9F6; text-decoration: none; font-family: 'Raleway', Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase;">SIGN IN</a>
          <p style="color: #6B7280; font-size: 12px; margin-top: 40px; line-height: 1.5;">If you did not request this link, you can safely ignore this email.</p>
        </div>
      `,
    });

    return { success: true };
  } catch (err) {
    console.error("Magic link send failed:", err);
    return { error: "Failed to send login link. Please try again." };
  }
}

export async function verifyAndCreateSession(
  token: string
): Promise<{ error?: string; redirect?: string }> {
  try {
    const { email } = await verifyMagicLinkToken(
      token,
      process.env.MAGIC_LINK_SECRET!
    );

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return { error: "Account not found" };
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return { redirect: user.role === "partner" ? "/events" : "/" };
  } catch {
    return { error: "Invalid or expired link. Please request a new one." };
  }
}

export async function signOut(): Promise<void> {
  await destroySession();
}
