import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { StockResult } from "@/lib/stock-calculator";

// Register fonts (system fallbacks — Liberation Serif/Sans)
Font.register({
  family: "Serif",
  src: "https://cdn.jsdelivr.net/npm/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-300-normal.woff2",
  fontWeight: 300,
});

Font.register({
  family: "Sans",
  src: "https://cdn.jsdelivr.net/npm/@fontsource/raleway/files/raleway-latin-400-normal.woff2",
  fontWeight: 400,
});

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
  }>;
  stock: StockResult;
}

export function BriefPDF({ event, contacts, cocktails, stock }: BriefPDFProps) {
  const attire =
    "Black waistcoat, black bow tie, white ironed shirt, smart black trousers, polished black leather shoes. Arrive in serving attire.";

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
          {event.venueName as string}
          {event.venueHallRoom ? `, ${event.venueHallRoom}` : ""}
          {"\n"}
          {event.guestCount as number} guests
        </Text>

        {/* 3. What */}
        <Text style={s.sectionTitle}>What</Text>
        <Text style={s.text}>
          {(event.staffCount as number) || "TBC"} staff,{" "}
          {(event.prepaidServes as number) || "TBC"} serves,{" "}
          {(event.stationCount as number) || "TBC"} stations
        </Text>

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

        {/* 5. Site Contacts */}
        {contacts.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Site Contacts</Text>
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
                  <Text style={[s.text, { fontStyle: "italic" }]}>
                    {c.menuDescription}
                  </Text>
                )}
                {c.ingredients.map((ing, j) => (
                  <Text key={j} style={s.text}>
                    {ing.ingredientName as string} {ing.amount as string}
                    {ing.unit as string}
                    {ing.brand ? ` (${ing.brand})` : ""}
                  </Text>
                ))}
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

        {/* 13. Attire */}
        <Text style={s.sectionTitle}>Attire</Text>
        <Text style={s.text}>{attire}</Text>

        {/* 14. Notes */}
        {event.notesCustom && (
          <>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text style={s.text}>{event.notesCustom as string}</Text>
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
