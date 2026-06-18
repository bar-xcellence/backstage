import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { StockResult } from "@/lib/stock-calculator";
import { stripWorkaroundMarkers } from "@/lib/notes-sanitization";
import type { EventStandardNote } from "@/lib/event-standard-notes-query";
import { formatAddressLines } from "@/lib/address-format";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1E1F2E" },
  title: { fontSize: 18, marginBottom: 4, fontFamily: "Times-Roman" },
  sub: { fontSize: 9, color: "#6B7280", marginBottom: 20 },
  heading: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 4 },
  text: { fontSize: 10, lineHeight: 1.5 },
  indent: { fontSize: 10, lineHeight: 1.5, marginLeft: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#D4C4B2",
  },
  divider: { borderBottomWidth: 0.5, borderBottomColor: "#D4C4B2", marginVertical: 6 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

/* eslint-disable @typescript-eslint/no-explicit-any */
interface TextOnlyBriefPDFProps {
  event: Record<string, any>;
  contacts: Array<Record<string, any>>;
  cocktails: Array<{
    menuName: string;
    menuDescription: string | null;
    stationNumber: number | null;
    ingredients: Array<Record<string, unknown>>;
    garnishes: Array<Record<string, unknown>>;
    cocktail?: {
      iceType?: string | null;
      iceAmountG?: number | null;
      straw?: boolean | null;
      strawType?: string | null;
    } | null;
  }>;
  stock: StockResult;
  standardNotes: EventStandardNote[];
  equipment: Array<{ itemName: string; quantity: number }>;
}

/**
 * Minimal text-only fallback brief. No images, no React PDF complex layout —
 * used when the full BriefPDF render fails (e.g. memory constraints on
 * Vercel serverless). Includes cocktail specs, stock list and equipment so the
 * bartending team has the operational data they need even in fallback mode.
 */
export function TextOnlyBriefPDF({
  event,
  contacts,
  cocktails,
  stock,
  standardNotes,
  equipment,
}: TextOnlyBriefPDFProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{event.eventName as string}</Text>
        <Text style={s.sub}>
          Backstage Event Brief (text-only){event.showName ? ` — ${event.showName}` : ""}
        </Text>

        <View style={s.divider} />

        <Text style={s.heading}>Event Details</Text>
        <Text style={s.text}>Date: {event.eventDate as string}</Text>
        <Text style={s.text}>Venue: {formatAddressLines(event).join(", ")}</Text>
        <Text style={s.text}>Guests: {event.guestCount as number}</Text>
        {(event.eventType || event.serviceType) && (
          <Text style={s.text}>
            {event.eventType
              ? `Type: ${(event.eventType as string).replace("_", " ")}`
              : ""}
            {event.eventType && event.serviceType ? " — " : ""}
            {event.serviceType
              ? `Service: ${(event.serviceType as string).replace("_", " / ")}`
              : ""}
          </Text>
        )}
        {event.stationCount ? (
          <Text style={s.text}>Stations: {event.stationCount as number}</Text>
        ) : null}
        {event.staffCount ? (
          <Text style={s.text}>Staff: {event.staffCount as number}</Text>
        ) : null}
        {event.flairRequired ? (
          <Text style={s.text}>Flair bartending required</Text>
        ) : null}
        {event.dryIce ? <Text style={s.text}>Dry ice required</Text> : null}
        {event.popUpBar ? (
          <>
            <Text style={s.text}>
              Pop-up bar
              {event.popUpBarSize ? ` — ${event.popUpBarSize as string}` : ""}
            </Text>
            {event.popUpBarBranding ? (
              <Text style={s.text}>
                Branding: {event.popUpBarBranding as string}
              </Text>
            ) : null}
          </>
        ) : null}

        {(event.arriveTime || event.serviceStart || event.serviceEnd) && (
          <>
            <Text style={s.heading}>Times</Text>
            {event.arriveTime ? (
              <Text style={s.text}>Arrive: {event.arriveTime as string}</Text>
            ) : null}
            {event.setupDeadline ? (
              <Text style={s.text}>Setup by: {event.setupDeadline as string}</Text>
            ) : null}
            {event.serviceStart ? (
              <Text style={s.text}>Service start: {event.serviceStart as string}</Text>
            ) : null}
            {event.serviceEnd ? (
              <Text style={s.text}>Service end: {event.serviceEnd as string}</Text>
            ) : null}
            {event.departTime ? (
              <Text style={s.text}>Depart: {event.departTime as string}</Text>
            ) : null}
          </>
        )}

        {event.batchingInstructions ? (
          <>
            <Text style={s.heading}>Batching</Text>
            <Text style={s.text}>{event.batchingInstructions as string}</Text>
          </>
        ) : null}

        {event.installInstructions ? (
          <>
            <Text style={s.heading}>Install Instructions</Text>
            <Text style={s.text}>{event.installInstructions as string}</Text>
          </>
        ) : null}

        {contacts && contacts.length > 0 && (
          <>
            <Text style={s.heading}>Site Contacts</Text>
            {(() => {
              const host = contacts.find((c) => c.isHost);
              return host ? (
                <Text style={s.text}>
                  Host: {host.contactName as string}
                  {host.contactPhone ? ` — ${host.contactPhone}` : ""}
                </Text>
              ) : null;
            })()}
            {contacts.map((c, i) => (
              <Text key={i} style={s.text}>
                {c.contactName as string}
                {c.contactRole ? ` (${c.contactRole})` : ""}
                {c.contactPhone ? ` — ${c.contactPhone}` : ""}
              </Text>
            ))}
          </>
        )}

        {standardNotes.map((note) => (
          <View key={note.label} wrap={false}>
            <Text style={s.heading}>{note.label}</Text>
            <Text style={s.text}>{note.content}</Text>
          </View>
        ))}

        {event.notesCustom ? (
          <>
            <Text style={s.heading}>Notes</Text>
            <Text style={s.text}>{stripWorkaroundMarkers(event.notesCustom as string)}</Text>
          </>
        ) : null}

        {cocktails.length > 0 && (
          <>
            <Text style={s.heading}>Cocktails</Text>
            {cocktails.map((c, i) => (
              <View key={i}>
                <Text style={s.text}>
                  {c.menuName}
                  {c.stationNumber ? ` — Station ${c.stationNumber}` : ""}
                </Text>
                {c.ingredients.map((ing, j) => (
                  <Text key={j} style={s.indent}>
                    {`- ${ing.amount as number}${ing.unit as string} ${ing.ingredientName as string}${ing.brand ? ` (${ing.brand as string})` : ""}`}
                  </Text>
                ))}
                {c.garnishes.map((g, j) => (
                  <Text key={j} style={s.indent}>
                    {`- ${g.quantity as number} ${g.quantityUnit as string} ${g.garnishName as string} (garnish)`}
                  </Text>
                ))}
                {c.cocktail?.iceType && (
                  <Text style={s.indent}>
                    {`- Ice: ${c.cocktail.iceType}${c.cocktail.iceAmountG ? ` (${c.cocktail.iceAmountG}g)` : ""}`}
                  </Text>
                )}
                {c.cocktail?.straw && c.cocktail.strawType && (
                  <Text style={s.indent}>
                    {`- Straw: ${c.cocktail.strawType}`}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        {stock.ingredients.length > 0 && (
          <>
            <Text style={s.heading}>Stock List</Text>
            {stock.ingredients.map((ing, i) => (
              <View key={i} style={s.row}>
                <Text style={s.text}>
                  {ing.ingredientName}
                  {ing.brand ? ` (${ing.brand})` : ""}
                </Text>
                <Text style={s.text}>
                  {ing.purchaseUnits} x {ing.bottleSize}ml
                </Text>
              </View>
            ))}
          </>
        )}

        {stock.manualItems.length > 0 && (
          <>
            <Text style={s.heading}>Manual Items</Text>
            {stock.manualItems.map((m, i) => (
              <View key={i} style={s.row}>
                <Text style={s.text}>
                  {m.ingredientName}
                  {m.brand ? ` (${m.brand})` : ""}
                </Text>
                <Text style={s.text}>
                  {m.totalQuantity} {m.unit}
                </Text>
              </View>
            ))}
          </>
        )}

        {stock.ice.length > 0 && (
          <>
            <Text style={s.heading}>Ice</Text>
            {stock.ice.map((i, idx) => (
              <View key={idx} style={s.row}>
                <Text style={s.text}>{i.iceType}</Text>
                <Text style={s.text}>{i.totalKg} kg</Text>
              </View>
            ))}
          </>
        )}

        {stock.straws.length > 0 && (
          <>
            <Text style={s.heading}>Straws</Text>
            {stock.straws.map((s2, idx) => (
              <View key={idx} style={s.row}>
                <Text style={s.text}>{s2.strawType}</Text>
                <Text style={s.text}>{s2.totalCount}</Text>
              </View>
            ))}
          </>
        )}

        {stock.consumables.length > 0 && (
          <>
            <Text style={s.heading}>Per-Event Stock</Text>
            {stock.consumables.map((c, idx) => (
              <View key={idx} style={s.row}>
                <Text style={s.text}>
                  {c.itemName}
                  {c.brand ? ` (${c.brand})` : ""}
                </Text>
                <Text style={s.text}>
                  {c.totalQuantity} {c.unit}
                  {c.totalQuantity === 1 ? "" : "s"}
                </Text>
              </View>
            ))}
          </>
        )}

        {equipment.length > 0 && (
          <>
            <Text style={s.heading}>Equipment</Text>
            {equipment.map((e, idx) => (
              <View key={idx} style={s.row}>
                <Text style={s.text}>{e.itemName}</Text>
                <Text style={s.text}>{e.quantity}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={s.footer}>
          Bar Excellence — generated by Backstage
        </Text>
      </Page>
    </Document>
  );
}
