"use server";

import { db } from "@/db";
import { eventFiles } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { del } from "@vercel/blob";
import { requireRole } from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
  validateEventFileInput,
  type EventFileCategory,
  type EventFileInput,
} from "@/lib/event-file-validation";

// Owner-only throughout — this table holds quotes and LC invoices, which the
// partner must never see. Deliberately unlike getEventEquipment, which allows
// the partner role.

export async function addEventFile(
  eventId: string,
  input: EventFileInput
): Promise<{ errors?: string[] }> {
  await requireRole("owner", "super_admin");

  const errors = validateEventFileInput(input);
  if (errors.length > 0) return { errors };

  await db.insert(eventFiles).values({
    eventId,
    category: input.category as EventFileCategory,
    fileName: input.fileName.trim(),
    blobUrl: input.blobUrl,
    fileSize: input.fileSize,
  });

  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function getEventFiles(eventId: string) {
  await requireRole("owner", "super_admin");

  return db
    .select()
    .from(eventFiles)
    .where(eq(eventFiles.eventId, eventId))
    .orderBy(asc(eventFiles.uploadedAt));
}

export async function deleteEventFile(id: string): Promise<{ error?: string }> {
  await requireRole("owner", "super_admin");

  const [file] = await db
    .select()
    .from(eventFiles)
    .where(eq(eventFiles.id, id))
    .limit(1);

  if (!file) return { error: "File not found" };

  try {
    await del(file.blobUrl);
  } catch {
    // Blob already gone — still remove the row.
  }

  await db.delete(eventFiles).where(eq(eventFiles.id, id));
  revalidatePath(`/events/${file.eventId}`);
  return {};
}
