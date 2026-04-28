type FinancialKeys =
  | "invoiceAmount"
  | "costAmount"
  | "stockReturnPolicy"
  | "cardPaymentPrice"
  | "cardPaymentCommission";

type StrippedFinancials = { [K in FinancialKeys]: null };

/**
 * Strips all financial fields that partners (Rory at LC) must never see.
 * Single source of truth — use this in every code path that returns event
 * data to a partner: getEvent(), listEvents(), and the PDF route.
 *
 * The five forbidden fields come from CLAUDE.md Role Security rules:
 *   invoiceAmount, costAmount, stockReturnPolicy,
 *   cardPaymentPrice, cardPaymentCommission
 *
 * The return type explicitly narrows each stripped field to `null` so
 * callers cannot accidentally treat the post-strip result as having data.
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
