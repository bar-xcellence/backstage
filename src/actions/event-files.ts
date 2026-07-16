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

  // Deliberately narrowed: a bare select() would serialise blobUrl into the
  // client payload. Nothing renders it — the UI reads files through
  // /api/event-files/[id] — so it should never leave the server.
  return db
    .select({
      id: eventFiles.id,
      category: eventFiles.category,
      fileName: eventFiles.fileName,
      fileSize: eventFiles.fileSize,
      uploadedAt: eventFiles.uploadedAt,
    })
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
  } catch (e) {
    // del() is idempotent on a missing blob, so this only fires on a network
    // or auth failure. Drop the row anyway — a stuck row the owner can't clear
    // is worse than an orphaned blob in a private store, which nothing can
    // reach. Logged so the orphan is at least traceable.
    console.error("Failed to delete blob", file.blobUrl, e);
  }

  await db.delete(eventFiles).where(eq(eventFiles.id, id));
  revalidatePath(`/events/${file.eventId}`);
  return {};
}
