export type DbStatus =
  | "enquiry"
  | "confirmed"
  | "preparation"
  | "ready"
  | "delivered"
  | "completed"
  | "cancelled";

export type DisplayStatus =
  | "provisional"
  | "confirmed"
  | "delivered"
  | "cancelled";

export function toPartnerStatus(s: DbStatus): DisplayStatus {
  switch (s) {
    case "enquiry":
      return "provisional";
    case "confirmed":
    case "preparation":
    case "ready":
      return "confirmed";
    case "delivered":
    case "completed":
      return "delivered";
    case "cancelled":
      return "cancelled";
    default: {
      // Compile-time exhaustiveness pin: a new DbStatus added to the enum
      // without updating this mapping will fail typechecking here, instead
      // of silently displaying as "confirmed" to partners.
      const _exhaustive: never = s;
      throw new Error(`Unhandled DbStatus: ${_exhaustive as string}`);
    }
  }
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
  "completed",
];
