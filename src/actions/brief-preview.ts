"use server";

import { getEvent } from "./events";
import { getEventCocktails } from "./event-cocktails";
import { calculateStock } from "@/lib/stock-calculator";
import { requireRole } from "@/lib/session";
import {
  fetchEventStandardNotes,
  type EventStandardNote,
} from "@/lib/event-standard-notes-query";

export interface BriefPreviewData {
  event: NonNullable<Awaited<ReturnType<typeof getEvent>>>;
  cocktails: Awaited<ReturnType<typeof getEventCocktails>>;
  stock: ReturnType<typeof calculateStock>;
  standardNotes: EventStandardNote[];
}

export async function getBriefPreview(
  eventId: string
): Promise<BriefPreviewData | null> {
  await requireRole("owner", "super_admin");

  const event = await getEvent(eventId);
  if (!event) return null;

  const cocktails = await getEventCocktails(eventId);

  const stockInput = cocktails.map((ec) => {
    const totalServes =
      (event.prepaidServes || 0) + (event.cardPaymentServes || 0);
    const cocktailCount = cocktails.length;
    return {
      servesAllocated:
        ec.servesAllocated ||
        (cocktailCount > 0 ? Math.floor(totalServes / cocktailCount) : 0),
      ingredients: ec.ingredients.map((ing) => ({
        ingredientName: ing.ingredientName,
        amount: Number(ing.amount),
        unit: ing.unit as string,
        brand: ing.brand,
        ingredientCategory: (ing.ingredientCategory as string) || "other",
      })),
      garnishes: ec.garnishes.map((g) => ({
        garnishName: g.garnishName,
        quantity: Number(g.quantity),
        quantityUnit: g.quantityUnit || "piece",
      })),
    };
  });

  const stock = calculateStock(stockInput);
  const standardNotes = await fetchEventStandardNotes(eventId);
  return { event, cocktails, stock, standardNotes };
}
