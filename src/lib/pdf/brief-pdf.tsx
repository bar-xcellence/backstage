import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { StockResult } from "@/lib/stock-calculator";
import { stripWorkaroundMarkers } from "@/lib/notes-sanitization";
import { formatAddressLines } from "@/lib/address-format";
import type { EventStandardNote } from "@/lib/event-standard-notes-query";

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Sans",
    fontSize: 10,
    color: "#7A5416",
    backgroundColor: "#FAF9F6",
  },
  header: {
    backgroundColor: "#1E1F2E",
    padding: 20,
    marginBottom: 24,
    marginTop: -40,
    marginLeft: -40,
    marginRight: -40,
  },
  headerTitle: {
    fontFamily: "Serif",
    fontSize: 20,
    fontWeight: 300,
    color: "#FAF9F6",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontFamily: "Sans",
    fontSize: 8,
    fontWeight: 400,
    color: "#6B7280",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  eventTitle: {
    fontFamily: "Serif",
    fontSize: 22,
    fontWeight: 300,
    color: "#1E1F2E",
    marginBottom: 4,
  },
  eventSub: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: "Serif",
    fontSize: 14,
    fontWeight: 300,
    color: "#A4731E",
    marginTop: 16,
    marginBottom: 8,
  },
  text: { fontSize: 10, lineHeight: 1.6, color: "#7A5416" },
  /** Secondary body — avoids fontStyle italic (extra Raleway face / resolution issues in react-pdf). */
  menuDescription: {
    fontSize: 10,
    lineHeight: 1.6,
    color: "#6B7280",
    fontStyle: "normal",
  },
  label: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#6B7280",
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#D4C4B2",
    borderBottomStyle: "solid",
  },
  bold: { fontWeight: 700 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#6B7280",
    textAlign: "center",
  },
});

/* eslint-disable @typescript-eslint/no-explicit-any */
interface BriefPDFProps {
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
      referenceImageUrl?: string | null;
    } | null;
  }>;
  stock: StockResult;
  standardNotes: EventStandardNote[];
  equipment: Array<{ itemName: string; quantity: number }>;
}

export function BriefPDF({
  event,
  contacts,
  cocktails,
  stock,
  standardNotes,
  equipment,
}: BriefPDFProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Backstage</Text>
          <Text style={s.headerSub}>Event Brief</Text>
        </View>

        {/* Event title */}
        <Text style={s.eventTitle}>{event.eventName as string}</Text>
        {event.showName && (
          <Text style={s.eventSub}>{event.showName as string}</Text>
        )}

        {/* 1. Date */}
        <Text style={s.sectionTitle}>Date</Text>
        <Text style={s.text}>{event.eventDate as string}</Text>

        {/* 2. Location */}
        <Text style={s.sectionTitle}>Location</Text>
        <Text style={s.text}>
          {formatAddressLines(event).join("\n")}
          {"\n"}
          {event.guestCount as number} guests
        </Text>

        {/* 3. What */}
        <Text style={s.sectionTitle}>What</Text>
        {(event.eventType || event.serviceType) && (
          <Text style={s.text}>
            {event.eventType ? (event.eventType as string).replace("_", " ") : ""}
            {event.eventType && event.serviceType ? " — " : ""}
            {event.serviceType
              ? (event.serviceType as string).replace("_", " / ")
              : ""}
          </Text>
        )}
        <Text style={s.text}>
          {(event.staffCount as number) || "TBC"} staff,{" "}
          {(event.prepaidServes as number) || "TBC"} serves,{" "}
          {(event.stationCount as number) || "TBC"} stations
        </Text>
        {event.flairRequired && (
          <Text style={s.text}>Flair bartending required</Text>
        )}
        {event.dryIce && <Text style={s.text}>Dry ice required</Text>}
        {event.popUpBar && (
          <Text style={s.text}>
            Pop-up bar
            {event.popUpBarSize ? ` — ${event.popUpBarSize as string}` : ""}
            {event.popUpBarBranding
              ? `\nBranding: ${event.popUpBarBranding as string}`
              : ""}
          </Text>
        )}

        {/* 4. Times */}
        {(event.arriveTime || event.serviceStart) && (
          <>
            <Text style={s.sectionTitle}>Times</Text>
            <Text style={s.text}>
              {event.arriveTime ? `Arrive: ${event.arriveTime}\n` : ""}
              {event.setupDeadline
                ? `Setup by: ${event.setupDeadline}\n`
                : ""}
              {event.serviceStart
                ? `Service: ${event.serviceStart}${event.serviceEnd ? ` — ${event.serviceEnd}` : ""}\n`
                : ""}
              {event.departTime ? `Depart: ${event.departTime}` : ""}
            </Text>
          </>
        )}

        {/* 4b. Batching */}
        {event.batchingInstructions && (
          <>
            <Text style={s.sectionTitle}>Batching</Text>
            <Text style={s.text}>{event.batchingInstructions as string}</Text>
          </>
        )}

        {/* 5. Site Contacts */}
        {contacts.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Site Contacts</Text>
            {(() => {
              const host = contacts.find((c) => c.isHost);
              return host ? (
                <Text style={[s.text, s.bold]}>
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

        {/* 6. Install */}
        {event.installInstructions && (
          <>
            <Text style={s.sectionTitle}>Install</Text>
            <Text style={s.text}>
              {event.installInstructions as string}
            </Text>
          </>
        )}

        {/* 9. Cocktails + 11. Specs */}
        {cocktails.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Cocktails and Specs</Text>
            {cocktails.map((c, i) => (
              <View key={i} style={{ marginBottom: 10 }}>
                <Text style={[s.text, s.bold]}>{c.menuName}</Text>
                {c.menuDescription && (
                  <Text style={[s.text, s.menuDescription]}>{c.menuDescription}</Text>
                )}
                {c.ingredients.map((ing, j) => (
                  <Text key={j} style={s.text}>
                    {ing.ingredientName as string} {ing.amount as string}
                    {ing.unit as string}
                    {ing.brand ? ` (${ing.brand})` : ""}
                  </Text>
                ))}
                {c.cocktail?.iceType && (
                  <Text style={s.text}>
                    Ice: {c.cocktail.iceType}
                    {c.cocktail.iceAmountG ? ` (${c.cocktail.iceAmountG}g)` : ""}
                  </Text>
                )}
                {c.cocktail?.straw && c.cocktail.strawType && (
                  <Text style={s.text}>Straw: {c.cocktail.strawType}</Text>
                )}
                {c.cocktail?.referenceImageUrl && (
                  <Image
                    src={c.cocktail.referenceImageUrl}
                    style={{ width: 120, height: 120, marginTop: 4 }}
                  />
                )}
              </View>
            ))}
          </>
        )}

        {/* 12. Stock List */}
        {stock.ingredients.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Stock List</Text>
            {stock.ingredients.map((ing, i) => (
              <View key={i} style={s.row}>
                <Text style={s.text}>
                  {ing.ingredientName}
                  {ing.brand ? ` (${ing.brand})` : ""}
                </Text>
                <Text style={[s.text, s.bold]}>
                  {ing.purchaseUnits} x {ing.bottleSize}ml
                </Text>
              </View>
            ))}
            {stock.garnishes.map((g, i) => (
              <View key={i} style={s.row}>
                <Text style={s.text}>{g.garnishName}</Text>
                <Text style={[s.text, s.bold]}>
                  {g.totalWithBuffer} {g.quantityUnit}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* 12b. Manual Items */}
        {stock.manualItems.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Manual Items</Text>
            {stock.manualItems.map((m, i) => (
              <View key={i} style={s.row}>
                <Text style={s.text}>
                  {m.ingredientName}
                  {m.brand ? ` (${m.brand})` : ""}
                </Text>
                <Text style={[s.text, s.bold]}>
                  {m.totalQuantity} {m.unit}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* 12c. Ice */}
        {stock.ice.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Ice</Text>
            {stock.ice.map((i, idx) => (
              <View key={idx} style={s.row}>
                <Text style={s.text}>{i.iceType}</Text>
                <Text style={[s.text, s.bold]}>{i.totalKg} kg</Text>
              </View>
            ))}
          </>
        )}

        {/* 12d. Straws */}
        {stock.straws.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Straws</Text>
            {stock.straws.map((s2, idx) => (
              <View key={idx} style={s.row}>
                <Text style={s.text}>{s2.strawType}</Text>
                <Text style={[s.text, s.bold]}>{s2.totalCount}</Text>
              </View>
            ))}
          </>
        )}

        {/* 12e. Per-Event Stock (substitutions, per-station consumables) */}
        {stock.consumables.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Per-Event Stock</Text>
            {stock.consumables.map((c, idx) => (
              <View key={idx} style={s.row}>
                <Text style={s.text}>
                  {c.itemName}
                  {c.brand ? ` (${c.brand})` : ""}
                </Text>
                <Text style={[s.text, s.bold]}>
                  {c.totalQuantity} {c.unit}
                  {c.totalQuantity === 1 ? "" : "s"}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* 12f. Equipment */}
        {equipment.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Equipment</Text>
            {equipment.map((e, i) => (
              <View key={i} style={s.row}>
                <Text style={s.text}>{e.itemName}</Text>
                <Text style={[s.text, s.bold]}>{e.quantity}</Text>
              </View>
            ))}
          </>
        )}

        {/* 13. Standard Notes */}
        {standardNotes.map((note) => (
          <View key={note.label} wrap={false}>
            <Text style={s.sectionTitle}>{note.label}</Text>
            <Text style={s.text}>{note.content}</Text>
          </View>
        ))}

        {/* 14. Notes */}
        {event.notesCustom && (
          <>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text style={s.text}>{stripWorkaroundMarkers(event.notesCustom as string)}</Text>
          </>
        )}

        {/* Footer */}
        <Text style={s.footer}>
          Backstage — Bar Excellence Events —{" "}
          {new Date().toLocaleDateString("en-GB")}
        </Text>
      </Page>
    </Document>
  );
}
