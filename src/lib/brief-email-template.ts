import type { getEvent } from "@/actions/events";
import type { getEventCocktails } from "@/actions/event-cocktails";
import type { calculateStock } from "@/lib/stock-calculator";
import { escapeHtml } from "./lc-email";

type EventWithContacts = NonNullable<Awaited<ReturnType<typeof getEvent>>>;
type EventCocktails = Awaited<ReturnType<typeof getEventCocktails>>;
type Stock = ReturnType<typeof calculateStock>;

export function buildBriefEmailHtml(
  event: EventWithContacts,
  eventCocktails: EventCocktails,
  stock: Stock
): string {
  const section = (title: string, content: string) =>
    content
      ? `
    <tr>
      <td style="padding: 24px 0 8px 0;">
        <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 20px; color: #A4731E; letter-spacing: -0.02em; margin: 0;">${escapeHtml(title)}</h2>
      </td>
    </tr>
    <tr>
      <td style="font-family: 'Raleway', Arial, sans-serif; font-size: 14px; color: #7A5416; line-height: 1.7; padding-bottom: 16px;">
        ${content}
      </td>
    </tr>`
      : "";

  const cocktailsHtml = eventCocktails
    .map((ec) => {
      const ingredients = ec.ingredients
        .map(
          (ing) =>
            `${escapeHtml(ing.ingredientName)} ${escapeHtml(ing.amount)}${escapeHtml(ing.unit)}${ing.brand ? ` (${escapeHtml(ing.brand)})` : ""}`
        )
        .join("<br>");

      const garnishes =
        ec.garnishes.length > 0
          ? `<br><em>Garnish: ${ec.garnishes
              .map(
                (g) =>
                  `${escapeHtml(g.quantity)} ${escapeHtml(g.quantityUnit)} ${escapeHtml(g.garnishName)}`
              )
              .join(", ")}</em>`
          : "";

      return `
    <div style="margin-bottom: 16px;">
      <strong>${escapeHtml(ec.menuName)}</strong>
      ${ec.menuDescription ? `<br><em style="color: #6B7280;">${escapeHtml(ec.menuDescription)}</em>` : ""}
      ${ec.stationNumber ? `<br><span style="font-size: 12px; color: #6B7280;">Station ${escapeHtml(ec.stationNumber)}</span>` : ""}
      <br>
      ${ingredients}
      ${garnishes}
    </div>`;
    })
    .join("");

  const stockHtml = stock.ingredients
    .map(
      (ing) =>
        `${escapeHtml(ing.ingredientName)}${ing.brand ? ` (${escapeHtml(ing.brand)})` : ""}: ${ing.purchaseUnits} x ${ing.bottleSize}ml (${(ing.totalMl / 1000).toFixed(1)}L)`
    )
    .join("<br>");

  const garnishHtml = stock.garnishes
    .map(
      (g) =>
        `${escapeHtml(g.garnishName)}: ${g.totalWithBuffer} ${escapeHtml(g.quantityUnit)}`
    )
    .join("<br>");

  const attireDefault =
    "Black waistcoat, black bow tie, white ironed shirt, smart black trousers, polished black leather shoes. Arrive in serving attire.";

  const contactsHtml =
    event.contacts && event.contacts.length > 0
      ? event.contacts
          .map(
            (c) =>
              `${escapeHtml(c.contactName)}${c.contactRole ? ` (${escapeHtml(c.contactRole)})` : ""}${c.contactPhone ? ` — ${escapeHtml(c.contactPhone)}` : ""}`
          )
          .join("<br>")
      : "";

  const installContent = [
    event.installInstructions && escapeHtml(event.installInstructions),
    event.parkingInstructions &&
      `Parking: ${escapeHtml(event.parkingInstructions)}`,
    event.accessRoute && `Access: ${escapeHtml(event.accessRoute)}`,
  ]
    .filter(Boolean)
    .join("<br>");

  const timesContent = [
    event.arriveTime && `Arrive: ${escapeHtml(event.arriveTime)}`,
    event.setupDeadline && `Setup by: ${escapeHtml(event.setupDeadline)}`,
    event.serviceStart &&
      `Service: ${escapeHtml(event.serviceStart)}${event.serviceEnd ? ` — ${escapeHtml(event.serviceEnd)}` : ""}`,
    event.departTime && `Depart: ${escapeHtml(event.departTime)}`,
  ]
    .filter(Boolean)
    .join("<br>");

  const whatContent = `${escapeHtml(event.eventType?.replace("_", " ") ?? "")} — ${escapeHtml(event.serviceType?.replace("_", " / ") ?? "")}<br>${escapeHtml(event.staffCount ?? "TBC")} staff, ${escapeHtml(event.prepaidServes ?? "TBC")} serves, ${escapeHtml(event.stationCount ?? "TBC")} stations${event.popUpBar ? "<br>Pop-up bar required" : ""}${event.flairRequired ? "<br>Flair bartending required" : ""}${event.dryIce ? "<br>Dry ice required" : ""}`;

  const locationContent = `${escapeHtml(event.venueName)}${event.venueHallRoom ? `, ${escapeHtml(event.venueHallRoom)}` : ""}<br>${escapeHtml(event.guestCount)} guests`;

  const manualItemsContent =
    stock.manualItems.length > 0
      ? stock.manualItems
          .map(
            (m) =>
              `${escapeHtml(m.ingredientName)}: ${m.totalQuantity} ${escapeHtml(m.unit)}`
          )
          .join("<br>")
      : "";

  const notesContent = event.notesCustom
    ? escapeHtml(event.notesCustom).replace(/\n/g, "<br>")
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background: #FAF9F6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #FAF9F6;">
    <tr>
      <td style="background: #1E1F2E; padding: 24px 32px;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 24px; color: #FAF9F6; margin: 0; letter-spacing: -0.02em;">Backstage</h1>
        <p style="font-family: 'Raleway', Arial, sans-serif; font-size: 10px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: #6B7280; margin: 4px 0 0 0;">Event Brief</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 28px; color: #1E1F2E; margin: 0 0 8px 0;">${escapeHtml(event.eventName)}</h1>
        ${event.showName ? `<p style="font-family: 'Raleway', Arial, sans-serif; font-size: 14px; color: #6B7280; margin: 0;">${escapeHtml(event.showName)}</p>` : ""}

        <table width="100%" cellpadding="0" cellspacing="0">
          ${section("Date", escapeHtml(event.eventDate))}
          ${section("Location", locationContent)}
          ${section("What", whatContent)}
          ${section("Times", timesContent)}
          ${section("Site Contacts", contactsHtml)}
          ${section("Install", installContent)}
          ${section("Cocktails and Specs", cocktailsHtml)}
          ${section("Stock List", stockHtml + (garnishHtml ? `<br><br><strong>Garnishes:</strong><br>${garnishHtml}` : ""))}
          ${section("Manual Items", manualItemsContent)}
          ${section("Attire", attireDefault)}
          ${section("Notes", notesContent)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1E1F2E; padding: 20px 32px;">
        <p style="font-family: 'Raleway', Arial, sans-serif; font-size: 11px; color: #6B7280; margin: 0;">Sent from Backstage — Bar Excellence Events</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
