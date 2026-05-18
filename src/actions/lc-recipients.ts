"use server";

import { db } from "@/db";
import { lcRecipients } from "@/db/schema";
import { eq, and, ne, asc } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { validateRecipientInput } from "@/lib/recipient-validation";
import { revalidatePath } from "next/cache";

export async function listLcRecipients() {
  await requireRole("owner", "super_admin");
  return db
    .select()
    .from(lcRecipients)
    .orderBy(asc(lcRecipients.sortOrder), asc(lcRecipients.createdAt));
}

/** Public read used by the send flow (no role gate change — same owner+admin gate). */
export async function listActiveLcRecipientsForSend() {
  await requireRole("owner", "super_admin");
  const all = await db
    .select()
    .from(lcRecipients)
    .where(eq(lcRecipients.isActive, true))
    .orderBy(asc(lcRecipients.sortOrder), asc(lcRecipients.createdAt));
  return all;
}

export async function createLcRecipient(input: {
  label: string;
  email: string;
  isAutoCc: boolean;
  isDefaultTo: boolean;
}): Promise<{ errors?: string[]; id?: string }> {
  await requireRole("owner", "super_admin");

  const errors = validateRecipientInput(input);
  if (errors.length > 0) return { errors };

  const label = input.label.trim();
  const email = input.email.trim();

  if (input.isDefaultTo) {
    await db
      .update(lcRecipients)
      .set({ isDefaultTo: false })
      .where(eq(lcRecipients.isDefaultTo, true));
  }

  const [row] = await db
    .insert(lcRecipients)
    .values({
      label,
      email,
      isAutoCc: input.isAutoCc,
      isDefaultTo: input.isDefaultTo,
      isActive: true,
    })
    .returning({ id: lcRecipients.id });

  revalidatePath("/settings");
  return { id: row.id };
}

export async function updateLcRecipient(
  id: string,
  input: {
    label: string;
    email: string;
    isAutoCc: boolean;
    isActive: boolean;
  }
): Promise<{ errors?: string[] }> {
  await requireRole("owner", "super_admin");

  const errors = validateRecipientInput(input);
  if (errors.length > 0) return { errors };

  await db
    .update(lcRecipients)
    .set({
      label: input.label.trim(),
      email: input.email.trim(),
      isAutoCc: input.isAutoCc,
      isActive: input.isActive,
    })
    .where(eq(lcRecipients.id, id));

  revalidatePath("/settings");
  return {};
}

export async function deleteLcRecipient(id: string): Promise<void> {
  await requireRole("owner", "super_admin");
  await db.delete(lcRecipients).where(eq(lcRecipients.id, id));
  revalidatePath("/settings");
}

/** Make this recipient the sole default To. Clears any prior default. */
export async function setDefaultToRecipient(id: string): Promise<void> {
  await requireRole("owner", "super_admin");

  // Clear any other default first. neon-http has no transactions; sequencing
  // these two updates keeps the invariant correct even if the second fails
  // (worst case: zero defaults, which the picker handles via the event fallback).
  await db
    .update(lcRecipients)
    .set({ isDefaultTo: false })
    .where(and(eq(lcRecipients.isDefaultTo, true), ne(lcRecipients.id, id)));

  await db
    .update(lcRecipients)
    .set({ isDefaultTo: true, isActive: true })
    .where(eq(lcRecipients.id, id));

  revalidatePath("/settings");
}
