"use server";

import { db } from "@/db";
import {
  equipmentTemplates,
  equipmentTemplateItems,
  eventEquipment,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { scaleEquipment } from "@/lib/equipment-scaler";
import { revalidatePath } from "next/cache";

export async function getEquipmentTemplates() {
  await requireRole("owner", "super_admin");

  return db.query.equipmentTemplates.findMany({
    where: eq(equipmentTemplates.isActive, true),
    with: {
      items: {
        orderBy: [asc(equipmentTemplateItems.sortOrder)],
      },
    },
  });
}

export async function getEventEquipment(eventId: string) {
  await requireRole("owner", "super_admin", "partner");

  return db
    .select()
    .from(eventEquipment)
    .where(eq(eventEquipment.eventId, eventId))
    .orderBy(asc(eventEquipment.sortOrder));
}

export async function applyTemplate(
  eventId: string,
  templateId: string,
  stationCount: number,
  spiritCount: number,
  ingredientCount: number
) {
  await requireRole("owner", "super_admin");

  // Fetch template items
  const items = await db
    .select()
    .from(equipmentTemplateItems)
    .where(eq(equipmentTemplateItems.templateId, templateId))
    .orderBy(asc(equipmentTemplateItems.sortOrder));

  if (items.length === 0) return;

  // Scale items based on event context
  const scaled = scaleEquipment(items, {
    stationCount,
    spiritCount,
    ingredientCount,
  });

  // Get current highest sortOrder for this event
  const existing = await db
    .select({ sortOrder: eventEquipment.sortOrder })
    .from(eventEquipment)
    .where(eq(eventEquipment.eventId, eventId))
    .orderBy(asc(eventEquipment.sortOrder));

  const startOrder =
    existing.length > 0
      ? existing[existing.length - 1].sortOrder + 1
      : 0;

  await db.insert(eventEquipment).values(
    scaled.map((item, i) => ({
      eventId,
      itemName: item.itemName,
      quantity: item.quantity,
      isFromTemplate: true,
      sortOrder: startOrder + i,
    }))
  );

  revalidatePath(`/events/${eventId}`);
}

export async function addCustomEquipmentItem(
  eventId: string,
  itemName: string,
  quantity: number
) {
  await requireRole("owner", "super_admin");

  if (!itemName.trim()) return;
  if (quantity < 1) return;

  const existing = await db
    .select({ sortOrder: eventEquipment.sortOrder })
    .from(eventEquipment)
    .where(eq(eventEquipment.eventId, eventId))
    .orderBy(asc(eventEquipment.sortOrder));

  const nextOrder =
    existing.length > 0
      ? existing[existing.length - 1].sortOrder + 1
      : 0;

  await db.insert(eventEquipment).values({
    eventId,
    itemName: itemName.trim(),
    quantity,
    isFromTemplate: false,
    sortOrder: nextOrder,
  });

  revalidatePath(`/events/${eventId}`);
}

export async function removeEquipmentItem(
  itemId: string,
  eventId: string
) {
  await requireRole("owner", "super_admin");

  const [item] = await db
    .select()
    .from(eventEquipment)
    .where(eq(eventEquipment.id, itemId))
    .limit(1);

  if (!item || item.eventId !== eventId) return;

  await db
    .delete(eventEquipment)
    .where(eq(eventEquipment.id, itemId));

  revalidatePath(`/events/${eventId}`);
}

export async function updateEquipmentQuantity(
  itemId: string,
  eventId: string,
  quantity: number
) {
  await requireRole("owner", "super_admin");

  if (quantity < 1) return;

  const [item] = await db
    .select()
    .from(eventEquipment)
    .where(eq(eventEquipment.id, itemId))
    .limit(1);

  if (!item || item.eventId !== eventId) return;

  await db
    .update(eventEquipment)
    .set({ quantity })
    .where(eq(eventEquipment.id, itemId));

  revalidatePath(`/events/${eventId}`);
}
