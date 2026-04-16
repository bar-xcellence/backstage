"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { requireRole } from "@/lib/session";
import { getEventCocktails } from "./event-cocktails";
import { getEvent } from "./events";
import { calculateStock } from "@/lib/stock-calculator";
import { validateSendToLC } from "@/lib/event-validation";
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

    // Retry on 5xx server errors
    if (statusCode >= 500 && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      return sendWithRetry(params, attempt + 1);
    }

    const message =
      err instanceof Error ? err.message : "Email delivery failed";
    return { success: false, error: message };
  }
}

export async function sendToLC(
  eventId: string
): Promise<{
  success?: boolean;
  error?: string;
  needsConfirmation?: boolean;
}> {
  await requireRole("owner", "super_admin");

  // Get event data
  const event = await getEvent(eventId);
  if (!event) return { error: "Event not found" };

  // Eng Review Issue 4A: Idempotent send — confirm before re-send
  if (event.lcSentAt) {
    return {
      needsConfirmation: true,
      error: `Brief was already sent on ${new Date(event.lcSentAt).toLocaleDateString("en-GB")}. Send again?`,
    };
  }

  // Get cocktails for the brief
  const eventCocktails = await getEventCocktails(eventId);

  // Validate prerequisites
  const errors = validateSendToLC({
    cocktailCount: eventCocktails.length,
    prepaidServes: event.prepaidServes || 0,
  });
  if (errors.length > 0) {
    return { error: errors.join(". ") };
  }

  // Calculate stock
  const stockInput = eventCocktails.map((ec) => {
    const totalServes =
      (event.prepaidServes || 0) + (event.cardPaymentServes || 0);
    const cocktailCount = eventCocktails.length;
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

  // Build email HTML
  const html = buildBriefEmailHtml(event, eventCocktails, stock);

  // Send email with retry (Eng Review Issue 4A)
  const result = await sendWithRetry({
    from: process.env.FROM_EMAIL!,
    to: event.lcRecipient === "Rory" ? "rory@lc-group.com" : event.lcRecipient!,
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
    // Log but don't fail — email was already sent
    console.error(
      `Warning: Email sent but failed to update lc_sent_at for event ${eventId}`
    );
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  return { success: true };
}

export async function confirmResendToLC(
  eventId: string
): Promise<{ success?: boolean; error?: string }> {
  await requireRole("owner", "super_admin");

  // Force resend by clearing lc_sent_at first
  await db
    .update(events)
    .set({ lcSentAt: null })
    .where(eq(events.id, eventId));

  return sendToLC(eventId);
}

// ── Email Template ─────────────────────────────────────

function buildBriefEmailHtml(
  event: NonNullable<Awaited<ReturnType<typeof getEvent>>>,
  eventCocktails: Awaited<ReturnType<typeof getEventCocktails>>,
  stock: ReturnType<typeof calculateStock>
): string {
  const section = (title: string, content: string) =>
    content
      ? `
    <tr>
      <td style="padding: 24px 0 8px 0;">
        <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 20px; color: #A4731E; letter-spacing: -0.02em; margin: 0;">${title}</h2>
      </td>
    </tr>
    <tr>
      <td style="font-family: 'Raleway', Arial, sans-serif; font-size: 14px; color: #7A5416; line-height: 1.7; padding-bottom: 16px;">
        ${content}
      </td>
    </tr>`
      : "";

  const cocktailsHtml = eventCocktails
    .map(
      (ec) => `
    <div style="margin-bottom: 16px;">
      <strong>${ec.menuName}</strong>
      ${ec.menuDescription ? `<br><em style="color: #6B7280;">${ec.menuDescription}</em>` : ""}
      ${ec.stationNumber ? `<br><span style="font-size: 12px; color: #6B7280;">Station ${ec.stationNumber}</span>` : ""}
      <br>
      ${ec.ingredients.map((ing) => `${ing.ingredientName} ${ing.amount}${ing.unit}${ing.brand ? ` (${ing.brand})` : ""}`).join("<br>")}
      ${ec.garnishes.length > 0 ? `<br><em>Garnish: ${ec.garnishes.map((g) => `${g.quantity} ${g.quantityUnit} ${g.garnishName}`).join(", ")}</em>` : ""}
    </div>`
    )
    .join("");

  const stockHtml = stock.ingredients
    .map(
      (ing) =>
        `${ing.ingredientName}${ing.brand ? ` (${ing.brand})` : ""}: ${ing.purchaseUnits} x ${ing.bottleSize}ml (${(ing.totalMl / 1000).toFixed(1)}L)`
    )
    .join("<br>");

  const garnishHtml = stock.garnishes
    .map((g) => `${g.garnishName}: ${g.totalWithBuffer} ${g.quantityUnit}`)
    .join("<br>");

  const attireDefault =
    "Black waistcoat, black bow tie, white ironed shirt, smart black trousers, polished black leather shoes. Arrive in serving attire.";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background: #FAF9F6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #FAF9F6;">
    <!-- Header -->
    <tr>
      <td style="background: #1E1F2E; padding: 24px 32px;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 24px; color: #FAF9F6; margin: 0; letter-spacing: -0.02em;">Backstage</h1>
        <p style="font-family: 'Raleway', Arial, sans-serif; font-size: 10px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: #6B7280; margin: 4px 0 0 0;">Event Brief</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 28px; color: #1E1F2E; margin: 0 0 8px 0;">${event.eventName}</h1>
        ${event.showName ? `<p style="font-family: 'Raleway', Arial, sans-serif; font-size: 14px; color: #6B7280; margin: 0;">${event.showName}</p>` : ""}

        <table width="100%" cellpadding="0" cellspacing="0">
          ${section("Date", event.eventDate)}
          ${section("Location", `${event.venueName}${event.venueHallRoom ? `, ${event.venueHallRoom}` : ""}<br>${event.guestCount} guests`)}
          ${section("What", `${event.eventType?.replace("_", " ")} — ${event.serviceType?.replace("_", " / ")}<br>${event.staffCount || "TBC"} staff, ${event.prepaidServes || "TBC"} serves, ${event.stationCount || "TBC"} stations${event.popUpBar ? "<br>Pop-up bar required" : ""}${event.flairRequired ? "<br>Flair bartending required" : ""}${event.dryIce ? "<br>Dry ice required" : ""}`)}
          ${section("Times", [event.arriveTime && `Arrive: ${event.arriveTime}`, event.setupDeadline && `Setup by: ${event.setupDeadline}`, event.serviceStart && `Service: ${event.serviceStart}${event.serviceEnd ? ` — ${event.serviceEnd}` : ""}`, event.departTime && `Depart: ${event.departTime}`].filter(Boolean).join("<br>"))}
          ${event.contacts && event.contacts.length > 0 ? section("Site Contacts", event.contacts.map((c) => `${c.contactName}${c.contactRole ? ` (${c.contactRole})` : ""}${c.contactPhone ? ` — ${c.contactPhone}` : ""}`).join("<br>")) : ""}
          ${section("Install", [event.installInstructions, event.parkingInstructions && `Parking: ${event.parkingInstructions}`, event.accessRoute && `Access: ${event.accessRoute}`].filter(Boolean).join("<br>"))}
          ${section("Cocktails and Specs", cocktailsHtml)}
          ${section("Stock List", stockHtml + (garnishHtml ? `<br><br><strong>Garnishes:</strong><br>${garnishHtml}` : ""))}
          ${stock.manualItems.length > 0 ? section("Manual Items", stock.manualItems.map((m) => `${m.ingredientName}: ${m.totalQuantity} ${m.unit}`).join("<br>")) : ""}
          ${section("Attire", attireDefault)}
          ${event.notesCustom ? section("Notes", event.notesCustom.replace(/\n/g, "<br>")) : ""}
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background: #1E1F2E; padding: 20px 32px;">
        <p style="font-family: 'Raleway', Arial, sans-serif; font-size: 11px; color: #6B7280; margin: 0;">Sent from Backstage — Bar Excellence Events</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
