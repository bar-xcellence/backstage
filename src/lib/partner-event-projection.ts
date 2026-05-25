/**
 * Partner-event-projection: classifies every column on `events` into one of
 * three buckets so a partner (Rory at LC) is mathematically prevented from
 * receiving owner-only or financial data.
 *
 * The pinned test in partner-event-projection.test.ts will fail when a new
 * column is added to `events` until a human consciously assigns it to one
 * of these three lists.
 */

import { toPartnerStatus, type DbStatus, type DisplayStatus } from "./dashboard-status";
import type { events } from "@/db/schema";

// The strict shape of a row selected from the `events` table — gives the
// projection compile-time field/typo safety so renames or accidental
// `row.venueNamne` typos fail at build instead of silently emitting undefined.
export type EventRow = typeof events.$inferSelect;

// Real columns on `events` that a partner may receive.
//
// NOTE: `eventName` is included so the event detail page (`/events/[id]`) has a
// meaningful header for partners. The dashboard card projection doesn't render
// it (see PartnerEventCard below), but partner-visible surfaces that DO need a
// title can read it. `showName` stays owner-only — it's a more internal label.
export const PARTNER_VISIBLE_DB_FIELDS = [
  "id",
  "eventName",
  "eventDate",
  "eventType",
  "guestCount",
  "elementsSummary",
  "venueName",
  "venueHallRoom",
  "addressLine1",
  "addressLine2",
  "city",
  "postcode",
  "venueTenant",
  "cateringPartner",
  "status",
  "lcPayout",
  "commissionNote",
] as const;

// Server-computed fields appended to the partner shape but not on `events`.
export const PARTNER_VISIBLE_COMPUTED_FIELDS = ["serveCount"] as const;

// Columns on `events` that are strictly owner-only (not financial, not
// partner-safe). New owner-only columns are added here.
export const OWNER_ONLY_FIELDS = [
  "createdBy",
  "showName",
  "arriveTime",
  "setupDeadline",
  "serviceStart",
  "serviceEnd",
  "departTime",
  "serviceType",
  "prepaidServes",
  "stationCount",
  "stationLayoutNotes",
  "batchingInstructions",
  "staffCount",
  "staffNames",
  "flairRequired",
  "popUpBar",
  "popUpBarSupplier",
  "popUpBarSize",
  "popUpBarBranding",
  "dryIce",
  "menuFrameCount",
  "menuNotes",
  "installInstructions",
  "parkingInstructions",
  "accessRoute",
  "vehicleReg",
  "cardPaymentService",
  "cardPaymentServes",
  "lcRecipient",
  "lcSentAt",
  "lcConfirmedAt",
  "notesCustom",
  "outcomeNotes",
  "createdAt",
  "updatedAt",
  "lastAlertSentAt",
] as const;

// Mirror of the field names stripPartnerFinancials() zeroes out. Single
// source of truth for the financial allow-deny lives in
// src/lib/partner-event-sanitisation.ts; this list pins the test against it.
export const PARTNER_STRIPPED_FIELDS = [
  "invoiceAmount",
  "costAmount",
  "stockReturnPolicy",
  "cardPaymentPrice",
  "cardPaymentCommission",
] as const;

export type PartnerEventCard = {
  id: string;
  eventDate: string;
  eventType: string | null;
  guestCount: number;
  serveCount: number;
  elementsSummary: string | null;
  venueName: string;
  venueHallRoom: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  venueTenant: string | null;
  cateringPartner: string | null;
  status: DisplayStatus;
  lcPayout: string | null;
  commissionNote: string | null;
};

/**
 * Projects a full event row (plus a computed serve count) into the partner
 * shape, dropping every field not in PARTNER_VISIBLE_DB_FIELDS.
 *
 * The `row` parameter is typed as `EventRow` (Drizzle's inferred select shape)
 * so a schema rename or property typo fails at compile time rather than
 * silently emitting undefined cast to a non-null type.
 */
export function projectPartnerEvent(
  row: EventRow,
  serveCount: number
): PartnerEventCard {
  return {
    id: row.id,
    eventDate: row.eventDate,
    eventType: row.eventType ?? null,
    guestCount: row.guestCount,
    serveCount,
    elementsSummary: row.elementsSummary ?? null,
    venueName: row.venueName,
    venueHallRoom: row.venueHallRoom ?? null,
    addressLine1: row.addressLine1 ?? null,
    addressLine2: row.addressLine2 ?? null,
    city: row.city ?? null,
    postcode: row.postcode ?? null,
    venueTenant: row.venueTenant ?? null,
    cateringPartner: row.cateringPartner ?? null,
    status: toPartnerStatus(row.status as DbStatus),
    lcPayout: row.lcPayout ?? null,
    commissionNote: row.commissionNote ?? null,
  };
}
