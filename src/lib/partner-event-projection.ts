/**
 * Partner-event-projection: classifies every column on `events` into one of
 * three buckets so a partner (Rory at LC) is mathematically prevented from
 * receiving owner-only or financial data.
 *
 * The pinned test in partner-event-projection.test.ts will fail when a new
 * column is added to `events` until a human consciously assigns it to one
 * of these three lists.
 */

// Real columns on `events` that a partner may receive.
export const PARTNER_VISIBLE_DB_FIELDS = [
  "id",
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
  "eventName",
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
  status: string;
  lcPayout: string | null;
  commissionNote: string | null;
};

/**
 * Projects a full event row (plus a computed serve count) into the partner
 * shape, dropping every field not in PARTNER_VISIBLE_DB_FIELDS.
 */
export function projectPartnerEvent(
  row: Record<string, unknown>,
  serveCount: number
): PartnerEventCard {
  return {
    id: row.id as string,
    eventDate: row.eventDate as string,
    eventType: (row.eventType as string | null) ?? null,
    guestCount: row.guestCount as number,
    serveCount,
    elementsSummary: (row.elementsSummary as string | null) ?? null,
    venueName: row.venueName as string,
    venueHallRoom: (row.venueHallRoom as string | null) ?? null,
    addressLine1: (row.addressLine1 as string | null) ?? null,
    addressLine2: (row.addressLine2 as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    postcode: (row.postcode as string | null) ?? null,
    venueTenant: (row.venueTenant as string | null) ?? null,
    cateringPartner: (row.cateringPartner as string | null) ?? null,
    status: row.status as string,
    lcPayout: (row.lcPayout as string | null) ?? null,
    commissionNote: (row.commissionNote as string | null) ?? null,
  };
}
