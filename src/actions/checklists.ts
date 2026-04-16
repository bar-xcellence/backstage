"use server";

import { db } from "@/db";
import { eventChecklists, events } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { getTemplateItems } from "@/db/checklist-templates";
import { revalidatePath } from "next/cache";

export async function getEventChecklist(eventId: string) {
  await requireRole("owner", "super_admin");
  return db
    .select()
    .from(eventChecklists)
    .where(eq(eventChecklists.eventId, eventId))
    .orderBy(asc(eventChecklists.sortOrder));
}

export async function generateChecklist(eventId: string) {
  await requireRole("owner", "super_admin");

  // Don't regenerate if items already exist
  const existing = await db
    .select({ id: eventChecklists.id })
    .from(eventChecklists)
    .where(eq(eventChecklists.eventId, eventId))
    .limit(1);

  if (existing.length > 0) return;

  // Get event type to determine template
  const [event] = await db
    .select({ eventType: events.eventType })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) return;

  const items = getTemplateItems(event.eventType || "corporate");

  await db.insert(eventChecklists).values(
    items.map((item) => ({
      eventId,
      label: item.label,
      isCompleted: false,
      isCustom: false,
      sortOrder: item.sortOrder,
    }))
  );

  revalidatePath(`/events/${eventId}`);
}

export async function toggleChecklistItem(
  itemId: string,
  eventId: string
) {
  await requireRole("owner", "super_admin");

  const [item] = await db
    .select()
    .from(eventChecklists)
    .where(eq(eventChecklists.id, itemId))
    .limit(1);

  if (!item || item.eventId !== eventId) return;

  await db
    .update(eventChecklists)
    .set({
      isCompleted: !item.isCompleted,
      completedAt: !item.isCompleted ? new Date() : null,
    })
    .where(eq(eventChecklists.id, itemId));

  revalidatePath(`/events/${eventId}`);
}

export async function addCustomChecklistItem(
  eventId: string,
  label: string
) {
  await requireRole("owner", "super_admin");

  if (!label.trim()) return;

  // Get the highest sort order
  const existing = await db
    .select({ sortOrder: eventChecklists.sortOrder })
    .from(eventChecklists)
    .where(eq(eventChecklists.eventId, eventId))
    .orderBy(asc(eventChecklists.sortOrder));

  const nextOrder =
    existing.length > 0
      ? existing[existing.length - 1].sortOrder + 1
      : 0;

  await db.insert(eventChecklists).values({
    eventId,
    label: label.trim(),
    isCompleted: false,
    isCustom: true,
    sortOrder: nextOrder,
  });

  revalidatePath(`/events/${eventId}`);
}

export async function removeCustomChecklistItem(
  itemId: string,
  eventId: string
) {
  await requireRole("owner", "super_admin");

  // Only allow removing custom items
  const [item] = await db
    .select()
    .from(eventChecklists)
    .where(eq(eventChecklists.id, itemId))
    .limit(1);

  if (!item || !item.isCustom || item.eventId !== eventId) return;

  await db
    .delete(eventChecklists)
    .where(eq(eventChecklists.id, itemId));

  revalidatePath(`/events/${eventId}`);
}
