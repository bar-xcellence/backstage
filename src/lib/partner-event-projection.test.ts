import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { events } from "@/db/schema";
import {
  PARTNER_VISIBLE_DB_FIELDS,
  PARTNER_VISIBLE_COMPUTED_FIELDS,
  OWNER_ONLY_FIELDS,
  PARTNER_STRIPPED_FIELDS,
  projectPartnerEvent,
  type EventRow,
} from "./partner-event-projection";

const allEventColumns = new Set(Object.keys(getTableColumns(events)));

describe("partner-event-projection allow-list", () => {
  it("every PARTNER_VISIBLE_DB_FIELDS key exists on the events schema", () => {
    for (const key of PARTNER_VISIBLE_DB_FIELDS) {
      expect(allEventColumns.has(key)).toBe(true);
    }
  });

  it("PARTNER_STRIPPED_FIELDS does not overlap with PARTNER_VISIBLE_DB_FIELDS", () => {
    for (const key of PARTNER_STRIPPED_FIELDS) {
      expect(PARTNER_VISIBLE_DB_FIELDS).not.toContain(key);
    }
  });

  it("PARTNER_STRIPPED_FIELDS does not overlap with PARTNER_VISIBLE_COMPUTED_FIELDS", () => {
    for (const key of PARTNER_STRIPPED_FIELDS) {
      expect(PARTNER_VISIBLE_COMPUTED_FIELDS).not.toContain(key as never);
    }
  });

  it("every column on events is classified into exactly one bucket", () => {
    const buckets = new Set<string>([
      ...PARTNER_VISIBLE_DB_FIELDS,
      ...OWNER_ONLY_FIELDS,
      ...PARTNER_STRIPPED_FIELDS,
    ]);

    const unclassified: string[] = [];
    for (const col of allEventColumns) {
      if (!buckets.has(col)) unclassified.push(col);
    }

    expect(unclassified).toEqual([]);
  });

  it("no column is in more than one bucket", () => {
    const counts = new Map<string, number>();
    for (const k of PARTNER_VISIBLE_DB_FIELDS) counts.set(k, (counts.get(k) ?? 0) + 1);
    for (const k of OWNER_ONLY_FIELDS) counts.set(k, (counts.get(k) ?? 0) + 1);
    for (const k of PARTNER_STRIPPED_FIELDS) counts.set(k, (counts.get(k) ?? 0) + 1);

    const duplicates = Array.from(counts.entries()).filter(([, n]) => n > 1);
    expect(duplicates).toEqual([]);
  });
});

// A representative full row that populates every owner-only + financial column
// so we can assert the projection output's keyset, not just the classification.
// Drizzle's inferred row shape requires fields the projection doesn't read,
// so we cast at the boundary rather than enumerate everything strictly.
const ownerHeavyRow = {
  id: "evt-1",
  createdBy: "user-1",
  eventName: "Owner Internal Label",
  showName: "Internal subtitle",
  eventDate: "2026-06-01",
  arriveTime: "14:00",
  setupDeadline: "16:00",
  serviceStart: "18:00",
  serviceEnd: "21:00",
  departTime: "22:30",
  venueName: "The Venue",
  venueHallRoom: "Suite 4",
  addressLine1: "1 Bothwell St",
  addressLine2: null,
  city: "Glasgow",
  postcode: "G1 2QF",
  venueTenant: null,
  cateringPartner: null,
  guestCount: 100,
  eventType: "corporate",
  serviceType: "cocktails_mocktails",
  prepaidServes: 130,
  stationCount: 2,
  stationLayoutNotes: "Stations at entrance",
  batchingInstructions: "Pre-pour at 17:00",
  staffCount: 4,
  staffNames: "Alex, Sam",
  flairRequired: true,
  popUpBar: true,
  popUpBarSupplier: "Acme",
  popUpBarSize: "3m curved",
  popUpBarBranding: "Vinyl wrap",
  dryIce: true,
  menuFrameCount: 2,
  menuNotes: "A4 frames",
  installInstructions: "Use service lift",
  parkingInstructions: "Loading bay B",
  accessRoute: "Through kitchen",
  vehicleReg: "AB12 CDE",
  cardPaymentService: true,
  cardPaymentPrice: "0.02",
  cardPaymentServes: 50,
  cardPaymentCommission: "0.015",
  invoiceAmount: "5000.00",
  costAmount: "2000.00",
  stockReturnPolicy: "Full return within 7 days",
  lcRecipient: "Rory",
  lcSentAt: new Date("2026-05-20T10:00:00Z"),
  lcConfirmedAt: null,
  status: "confirmed",
  notesCustom: "Owner private notes",
  lcPayout: "1500.00",
  commissionNote: "+ tips",
  elementsSummary: "Cocktails + canapés",
  outcomeNotes: null,
  createdAt: new Date("2026-04-01T10:00:00Z"),
  updatedAt: new Date("2026-05-01T10:00:00Z"),
  lastAlertSentAt: null,
} as unknown as EventRow;

describe("projectPartnerEvent output keyset", () => {
  it("emits exactly the partner-visible keys — never any owner-only field", () => {
    const projected = projectPartnerEvent(ownerHeavyRow, 42);
    const keys = Object.keys(projected).sort();

    // Expected keyset is PARTNER_VISIBLE_DB_FIELDS minus `eventName` (the
    // dashboard card doesn't carry it; the detail page reads it from getEvent
    // separately) plus the computed `serveCount`.
    const expected = [
      ...PARTNER_VISIBLE_DB_FIELDS.filter((k) => k !== "eventName"),
      ...PARTNER_VISIBLE_COMPUTED_FIELDS,
    ].sort();

    expect(keys).toEqual(expected);
  });

  it("never includes any OWNER_ONLY_FIELDS key on the wire payload", () => {
    const projected = projectPartnerEvent(ownerHeavyRow, 42);
    const json = JSON.parse(JSON.stringify(projected));
    for (const ownerKey of OWNER_ONLY_FIELDS) {
      expect(
        json,
        `expected partner projection to not expose ${ownerKey}`
      ).not.toHaveProperty(ownerKey);
    }
  });

  it("never includes any PARTNER_STRIPPED_FIELDS key on the wire payload", () => {
    const projected = projectPartnerEvent(ownerHeavyRow, 42);
    const json = JSON.parse(JSON.stringify(projected));
    for (const finKey of PARTNER_STRIPPED_FIELDS) {
      expect(
        json,
        `expected partner projection to not expose ${finKey}`
      ).not.toHaveProperty(finKey);
    }
  });

  it("collapses the raw db status via toPartnerStatus", () => {
    const projected = projectPartnerEvent(
      { ...ownerHeavyRow, status: "preparation" } as EventRow,
      0
    );
    // 'preparation' must NOT reach the wire — collapsed to 'confirmed'
    expect(projected.status).toBe("confirmed");
  });
});
