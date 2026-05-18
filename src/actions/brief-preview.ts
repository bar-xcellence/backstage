"use server";

import { db } from "@/db";
import { lcRecipients } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getEvent } from "./events";
import { getEventCocktails } from "./event-cocktails";
import { calculateStock } from "@/lib/stock-calculator";
import { fetchEventStock } from "@/lib/event-stock-query";
import { requireRole } from "@/lib/session";
import { resolveLCEmail } from "@/lib/lc-email";
import {
  fetchEventStandardNotes,
  type EventStandardNote,
} from "@/lib/event-standard-notes-query";

export interface SavedRecipientOption {
  id: string;
  label: string;
  email: string;
  isAutoCc: boolean;
  isDefaultTo: boolean;
}

export interface BriefPreviewData {
  event: NonNullable<Awaited<ReturnType<typeof getEvent>>>;
  cocktails: Awaited<ReturnType<typeof getEventCocktails>>;
  stock: ReturnType<typeof calculateStock>;
  standardNotes: EventStandardNote[];
  defaultTo: string | null;
  savedRecipients: SavedRecipientOption[];
  autoCcEmails: string[];
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
      iceAmountG: ec.cocktail?.iceAmountG ?? null,
      iceType: ec.cocktail?.iceType ?? null,
      straw: ec.cocktail?.straw ?? null,
      strawType: ec.cocktail?.strawType ?? null,
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

  const eventStockItems = await fetchEventStock(eventId);
  const stock = calculateStock(stockInput, {
    eventStockItems,
    stationCount: event.stationCount,
  });
  const standardNotes = await fetchEventStandardNotes(eventId);

  const savedRows = await db
    .select()
    .from(lcRecipients)
    .where(eq(lcRecipients.isActive, true))
    .orderBy(asc(lcRecipients.sortOrder), asc(lcRecipients.createdAt));

  const savedRecipients: SavedRecipientOption[] = savedRows.map((r) => ({
    id: r.id,
    label: r.label,
    email: r.email,
    isAutoCc: r.isAutoCc,
    isDefaultTo: r.isDefaultTo,
  }));

  const eventTo = resolveLCEmail(event.lcRecipient);
  const defaultFromSaved = savedRecipients.find((r) => r.isDefaultTo)?.email ?? null;
  const defaultTo = "email" in eventTo ? eventTo.email : defaultFromSaved;

  const autoCcEmails = savedRecipients
    .filter((r) => r.isAutoCc)
    .map((r) => r.email);

  return {
    event,
    cocktails,
    stock,
    standardNotes,
    defaultTo,
    savedRecipients,
    autoCcEmails,
  };
}
