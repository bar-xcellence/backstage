import { db } from "@/db";
import { eventStock } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { EventStockItem } from "./stock-calculator";

export async function fetchEventStock(
  eventId: string
): Promise<EventStockItem[]> {
  const rows = await db
    .select()
    .from(eventStock)
    .where(eq(eventStock.eventId, eventId))
    .orderBy(asc(eventStock.sortOrder));

  return rows.map((row) => ({
    itemName: row.itemName,
    category: row.category ?? "other",
    quantity: Number(row.quantity),
    unit: row.unit,
    brand: row.brand,
    scalingRule: row.scalingRule,
  }));
}
