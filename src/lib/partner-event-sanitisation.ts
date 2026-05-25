import { OWNER_ONLY_FIELDS } from "./partner-event-projection";

type FinancialKeys =
  | "invoiceAmount"
  | "costAmount"
  | "stockReturnPolicy"
  | "cardPaymentPrice"
  | "cardPaymentCommission";

type StrippedFinancials = { [K in FinancialKeys]: null };

type OwnerOnlyKey = (typeof OWNER_ONLY_FIELDS)[number];
type StrippedOwnerOnly = { [K in OwnerOnlyKey]: null };

/**
 * Strips all financial fields that partners (Rory at LC) must never see.
 *
 * Use {@link stripPartnerEvent} for the full owner-only + financial sanitisation
 * required at the event-detail / list-events boundary. This narrower helper
 * remains exported for surfaces that ONLY need the five forbidden financials.
 */
export function stripPartnerFinancials<T extends Record<FinancialKeys, unknown>>(
  event: T
): Omit<T, FinancialKeys> & StrippedFinancials {
  return {
    ...event,
    invoiceAmount: null,
    costAmount: null,
    stockReturnPolicy: null,
    cardPaymentPrice: null,
    cardPaymentCommission: null,
  };
}

/**
 * Strips every field that partners must never see — financials plus every
 * column classified as OWNER_ONLY in partner-event-projection.ts.
 *
 * This is the single source of truth applied by getEvent() and listEvents()
 * before returning event data to a partner session. The pinned list in
 * OWNER_ONLY_FIELDS is the authoritative classification; adding a new column
 * there automatically widens this sanitiser.
 */
export function stripPartnerEvent<T extends Record<string, unknown>>(
  event: T
): Omit<T, FinancialKeys | OwnerOnlyKey> & StrippedFinancials & StrippedOwnerOnly {
  const result = stripPartnerFinancials(
    event as T & Record<FinancialKeys, unknown>
  ) as Record<string, unknown>;
  for (const key of OWNER_ONLY_FIELDS) {
    result[key] = null;
  }
  return result as Omit<T, FinancialKeys | OwnerOnlyKey> &
    StrippedFinancials &
    StrippedOwnerOnly;
}
