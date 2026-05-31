import type { getEvent } from "@/actions/events";
import type { getEventCocktails } from "@/actions/event-cocktails";
import type { calculateStock } from "@/lib/stock-calculator";
import { escapeHtml } from "./lc-email";
import { stripWorkaroundMarkers } from "./notes-sanitization";
import { formatAddressLines } from "./address-format";
import { absolutiseUrl } from "./base-url";
import type { EventStandardNote } from "./event-standard-notes-query";

type EventWithContacts = NonNullable<Awaited<ReturnType<typeof getEvent>>>;
type EventCocktails = Awaited<ReturnType<typeof getEventCocktails>>;
type Stock = ReturnType<typeof calculateStock>;

export function buildBriefEmailHtml(
  event: EventWithContacts,
  eventCocktails: EventCocktails,
  stock: Stock,
  standardNotes: EventStandardNote[],
  baseUrl: string | null = null
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

      const c = ec.cocktail;
      const iceLine = c?.iceType
        ? `<br><span style="font-size: 12px; color: #6B7280;">Ice: ${escapeHtml(c.iceType)}${c.iceAmountG ? ` (${escapeHtml(c.iceAmountG)}g)` : ""}</span>`
        : "";
      const strawLine = c?.straw && c.strawType
        ? `<br><span style="font-size: 12px; color: #6B7280;">Straw: ${escapeHtml(c.strawType)}</span>`
        : "";
      const refImage = c?.referenceImageUrl
        ? `<br><img src="${escapeHtml(absolutiseUrl(c.referenceImageUrl, baseUrl))}" alt="${escapeHtml(ec.menuName)} reference" style="max-width: 240px; margin-top: 8px;">`
        : "";

      return `
    <div style="margin-bottom: 16px;">
      <strong>${escapeHtml(ec.menuName)}</strong>
      ${ec.menuDescription ? `<br><em style="color: #6B7280;">${escapeHtml(ec.menuDescription)}</em>` : ""}
      ${ec.stationNumber ? `<br><span style="font-size: 12px; color: #6B7280;">Station ${escapeHtml(ec.stationNumber)}</span>` : ""}
      <br>
      ${ingredients}
      ${garnishes}
      ${iceLine}
      ${strawLine}
      ${refImage}
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

  const hostContact = event.contacts?.find((c) => c.isHost);
  const hostLine = hostContact
    ? `<strong>Host:</strong> ${escapeHtml(hostContact.contactName)}${hostContact.contactPhone ? ` — ${escapeHtml(hostContact.contactPhone)}` : ""}<br><br>`
    : "";

  const contactsHtml =
    event.contacts && event.contacts.length > 0
      ? hostLine +
        event.contacts
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

  const popUpBarLine = event.popUpBar
    ? `<br>Pop-up bar required${event.popUpBarSize ? ` — ${escapeHtml(event.popUpBarSize)}` : ""}${event.popUpBarBranding ? `<br>Branding: ${escapeHtml(event.popUpBarBranding)}` : ""}`
    : "";

  const whatContent = `${escapeHtml(event.eventType?.replace("_", " ") ?? "")} — ${escapeHtml(event.serviceType?.replace("_", " / ") ?? "")}<br>${escapeHtml(event.staffCount ?? "TBC")} staff, ${escapeHtml(event.prepaidServes ?? "TBC")} serves, ${escapeHtml(event.stationCount ?? "TBC")} stations${popUpBarLine}${event.flairRequired ? "<br>Flair bartending required" : ""}${event.dryIce ? "<br>Dry ice required" : ""}`;

  const addressLines = formatAddressLines(event);
  const locationContent = `${addressLines.map((l) => escapeHtml(l)).join("<br>")}<br>${escapeHtml(event.guestCount)} guests`;

  const manualItemsContent =
    stock.manualItems.length > 0
      ? stock.manualItems
          .map(
            (m) =>
              `${escapeHtml(m.ingredientName)}: ${m.totalQuantity} ${escapeHtml(m.unit)}`
          )
          .join("<br>")
      : "";

  const iceContent =
    stock.ice.length > 0
      ? stock.ice
          .map((i) => `${escapeHtml(i.iceType)}: ${i.totalKg} kg`)
          .join("<br>")
      : "";

  const strawsContent =
    stock.straws.length > 0
      ? stock.straws
          .map((s) => `${escapeHtml(s.strawType)}: ${s.totalCount}`)
          .join("<br>")
      : "";

  const consumablesContent =
    stock.consumables.length > 0
      ? stock.consumables
          .map(
            (c) =>
              `${escapeHtml(c.itemName)}${c.brand ? ` (${escapeHtml(c.brand)})` : ""}: ${c.totalQuantity} ${escapeHtml(c.unit)}${c.totalQuantity === 1 ? "" : "s"}`
          )
          .join("<br>")
      : "";

  const standardNotesHtml = standardNotes
    .map((n) =>
      section(n.label, escapeHtml(n.content).replace(/\n/g, "<br>"))
    )
    .join("");

  const notesContent = event.notesCustom
    ? escapeHtml(stripWorkaroundMarkers(event.notesCustom)).replace(/\n/g, "<br>")
    : "";

  const batchingContent = event.batchingInstructions
    ? escapeHtml(event.batchingInstructions).replace(/\n/g, "<br>")
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
          ${section("Batching", batchingContent)}
          ${section("Site Contacts", contactsHtml)}
          ${section("Install", installContent)}
          ${section("Cocktails and Specs", cocktailsHtml)}
          ${section("Stock List", stockHtml + (garnishHtml ? `<br><br><strong>Garnishes:</strong><br>${garnishHtml}` : ""))}
          ${section("Manual Items", manualItemsContent)}
          ${section("Ice", iceContent)}
          ${section("Straws", strawsContent)}
          ${section("Per-Event Stock", consumablesContent)}
          ${standardNotesHtml}
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
