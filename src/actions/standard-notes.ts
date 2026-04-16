"use server";

import { db } from "@/db";
import { standardNotes, eventStandardNotes } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getStandardNotes() {
  await requireRole("owner", "super_admin", "partner");

  return db
    .select()
    .from(standardNotes)
    .where(eq(standardNotes.isActive, true))
    .orderBy(asc(standardNotes.sortOrder));
}

export async function getEventStandardNotes(eventId: string) {
  await requireRole("owner", "super_admin", "partner");

  return db
    .select()
    .from(eventStandardNotes)
    .where(eq(eventStandardNotes.eventId, eventId))
    .orderBy(asc(eventStandardNotes.sortOrder));
}

export async function toggleStandardNote(
  eventId: string,
  noteId: string
) {
  await requireRole("owner", "super_admin");

  // Check if junction already exists
  const [existing] = await db
    .select()
    .from(eventStandardNotes)
    .where(
      and(
        eq(eventStandardNotes.eventId, eventId),
        eq(eventStandardNotes.noteId, noteId)
      )
    )
    .limit(1);

  if (existing) {
    // Toggle off — remove junction
    await db
      .delete(eventStandardNotes)
      .where(eq(eventStandardNotes.id, existing.id));
  } else {
    // Toggle on — insert junction
    const allForEvent = await db
      .select({ sortOrder: eventStandardNotes.sortOrder })
      .from(eventStandardNotes)
      .where(eq(eventStandardNotes.eventId, eventId))
      .orderBy(asc(eventStandardNotes.sortOrder));

    const nextOrder =
      allForEvent.length > 0
        ? allForEvent[allForEvent.length - 1].sortOrder + 1
        : 0;

    await db.insert(eventStandardNotes).values({
      eventId,
      noteId,
      sortOrder: nextOrder,
    });
  }

  revalidatePath(`/events/${eventId}`);
}
