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

export const PARTNER_VISIBLE_STATUSES: DbStatus[] = [
  "enquiry",
  "confirmed",
  "preparation",
  "ready",
  "delivered",
  "cancelled",
];
