export type DbStatus =
  | "enquiry"
  | "confirmed"
  | "preparation"
  | "ready"
  | "delivered"
  | "cancelled";

export type DisplayStatus =
  | "provisional"
  | "confirmed"
  | "delivered"
  | "cancelled";

export function toPartnerStatus(s: DbStatus): DisplayStatus {
  if (s === "enquiry") return "provisional";
  if (s === "delivered" || s === "cancelled") return s;
  return "confirmed";
}

/**
 * Server-enforced allow-list of DB statuses a partner viewer may request.
 *
 * Partners see confirmed+ events only (per CLAUDE.md threat model and the
 * getEvent/listEvents/PDF route guards). The dashboard chip set may surface
 * Cancelled as a togglable filter; if/when that ships, add "cancelled" here.
 *
 * `enquiry`, `preparation`, `ready` map to "confirmed" or "provisional" in
 * `toPartnerStatus`. `preparation` and `ready` are partner-visible because the
 * underlying event is confirmed-for-LC; `enquiry` is owner-only.
 */
export const PARTNER_VISIBLE_STATUSES: readonly DbStatus[] = [
  "confirmed",
  "preparation",
  "ready",
  "delivered",
];
