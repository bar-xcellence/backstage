"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { requireRole } from "@/lib/session";
import { getEventCocktails } from "./event-cocktails";
import { getEvent } from "./events";
import { calculateStock } from "@/lib/stock-calculator";
import { fetchEventStock } from "@/lib/event-stock-query";
import { validateSendToLC } from "@/lib/event-validation";
import {
  resolveLCEmail,
  getFromEmail,
  resolveSendRecipients,
} from "@/lib/lc-email";
import { buildBriefEmailHtml } from "@/lib/brief-email-template";
import { fetchEventStandardNotes } from "@/lib/event-standard-notes-query";
import { revalidatePath } from "next/cache";

const resend = new Resend(process.env.RESEND_API_KEY);

// Eng Review Issue 4A: Full error handling
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sendWithRetry(
  params: Parameters<typeof resend.emails.send>[0],
  attempt = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send(params);
    return { success: true };
  } catch (err: unknown) {
    const statusCode =
      err && typeof err === "object" && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : 0;

    if (statusCode >= 500 && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      return sendWithRetry(params, attempt + 1);
    }

    const message =
      err instanceof Error ? err.message : "Email delivery failed";
    return { success: false, error: message };
  }
}

export interface SendRecipients {
  to: string;
  cc?: string[];
}

export async function sendToLC(
  eventId: string,
  recipients?: SendRecipients
): Promise<{
  success?: boolean;
  error?: string;
  needsConfirmation?: boolean;
}> {
  await requireRole("owner", "super_admin");

  const event = await getEvent(eventId);
  if (!event) return { error: "Event not found" };

  // Eng Review Issue 4A: Idempotent send — confirm before re-send
  if (event.lcSentAt) {
    return {
      needsConfirmation: true,
      error: `Brief was already sent on ${new Date(event.lcSentAt).toLocaleDateString("en-GB")}. Send again?`,
    };
  }

  // Validate sender (Settings → env fallback) before doing any work
  const from = await getFromEmail();
  if ("error" in from) {
    console.error("send-to-lc: From address invalid:", from.error);
    return { error: "Email sender not configured. Contact an administrator." };
  }

  // Resolve recipients: explicit picker selection wins; otherwise fall back to
  // the event's stored lcRecipient (preserves the legacy one-arg call path).
  let resolved: { to: string; cc: string[] } | { error: string };
  if (recipients) {
    resolved = resolveSendRecipients({
      to: recipients.to,
      cc: recipients.cc ?? [],
    });
  } else {
    const fallback = resolveLCEmail(event.lcRecipient);
    if ("error" in fallback) {
      return { error: fallback.error };
    }
    resolved = { to: fallback.email, cc: [] };
  }
  if ("error" in resolved) return { error: resolved.error };

  const eventCocktails = await getEventCocktails(eventId);

  const errors = validateSendToLC({
    cocktailCount: eventCocktails.length,
    prepaidServes: event.prepaidServes || 0,
  });
  if (errors.length > 0) {
    return { error: errors.join(". ") };
  }

  const stockInput = eventCocktails.map((ec) => {
    const totalServes =
      (event.prepaidServes || 0) + (event.cardPaymentServes || 0);
    const cocktailCount = eventCocktails.length;
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

  const html = buildBriefEmailHtml(event, eventCocktails, stock, standardNotes);

  const result = await sendWithRetry({
    from: from.email,
    to: resolved.to,
    cc: resolved.cc.length > 0 ? resolved.cc : undefined,
    subject: `Event Brief: ${event.eventName} — ${event.eventDate}`,
    html,
  });

  if (!result.success) {
    return {
      error: `Failed to send after ${MAX_RETRIES} attempts: ${result.error}`,
    };
  }

  // Update lc_sent_at — if this fails, email was still sent (Eng Review Issue 4A)
  try {
    await db
      .update(events)
      .set({ lcSentAt: new Date(), updatedAt: new Date() })
      .where(eq(events.id, eventId));
  } catch {
    console.error(
      `Warning: Email sent but failed to update lc_sent_at for event ${eventId}`
    );
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  return { success: true };
}

export async function confirmResendToLC(
  eventId: string,
  recipients?: SendRecipients
): Promise<{ success?: boolean; error?: string }> {
  await requireRole("owner", "super_admin");

  await db
    .update(events)
    .set({ lcSentAt: null })
    .where(eq(events.id, eventId));

  return sendToLC(eventId, recipients);
}
