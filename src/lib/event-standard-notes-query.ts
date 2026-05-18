import { db } from "@/db";
import { eventStandardNotes, standardNotes } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export type EventStandardNote = {
  label: string;
  content: string;
};

export async function fetchEventStandardNotes(
  eventId: string
): Promise<EventStandardNote[]> {
  const rows = await db
    .select({
      label: standardNotes.label,
      content: standardNotes.content,
      sortOrder: eventStandardNotes.sortOrder,
    })
    .from(eventStandardNotes)
    .innerJoin(
      standardNotes,
      eq(eventStandardNotes.noteId, standardNotes.id)
    )
    .where(eq(eventStandardNotes.eventId, eventId))
    .orderBy(asc(eventStandardNotes.sortOrder));

  return rows.map(({ label, content }) => ({ label, content }));
}
