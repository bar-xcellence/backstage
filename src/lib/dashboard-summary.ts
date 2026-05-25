import { toPartnerStatus, type DbStatus } from "./dashboard-status";

export type SummaryInputEvent = {
  status: DbStatus;
  lcPayout: string | null;
  invoiceAmount: string | null;
  lcSentAt: Date | null;
};

export type SummaryTotals = {
  eventCount: number;
  confirmedTotal: number;
  provisionalTotal: number;
  invoicedDeliveredTotal: number;
  briefUnsentCount: number;
};

// Partner-safe subset of SummaryTotals — omits invoice + brief-workflow signals.
//
// Branded as a nominal type so that the wider `SummaryTotals` (which contains
// owner-only `invoicedDeliveredTotal` + `briefUnsentCount`) is NOT structurally
// assignable to `PartnerSummary`. A future caller that writes `summary: summary`
// for the partner branch instead of `toPartnerSummary(summary)` will fail to
// compile, closing the type-level escape hatch flagged in the security review.
declare const partnerSummaryBrand: unique symbol;
export type PartnerSummary = {
  readonly eventCount: number;
  readonly confirmedTotal: number;
  readonly provisionalTotal: number;
  readonly [partnerSummaryBrand]: never;
};

export function toPartnerSummary(s: SummaryTotals): PartnerSummary {
  return {
    eventCount: s.eventCount,
    confirmedTotal: s.confirmedTotal,
    provisionalTotal: s.provisionalTotal,
  } as PartnerSummary;
}

const CONFIRMED_PLUS: ReadonlyArray<DbStatus> = [
  "confirmed",
  "preparation",
  "ready",
];

function toNumber(s: string | null): number {
  if (s === null) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function rollUpSummary(events: SummaryInputEvent[]): SummaryTotals {
  let confirmedTotal = 0;
  let provisionalTotal = 0;
  let invoicedDeliveredTotal = 0;
  let briefUnsentCount = 0;

  for (const e of events) {
    if (e.status === "cancelled") continue;

    const display = toPartnerStatus(e.status);
    if (display === "confirmed") {
      confirmedTotal += toNumber(e.lcPayout);
    } else if (display === "provisional") {
      provisionalTotal += toNumber(e.lcPayout);
    }

    if (e.status === "delivered") {
      invoicedDeliveredTotal += toNumber(e.invoiceAmount);
    }

    if (CONFIRMED_PLUS.includes(e.status) && e.lcSentAt === null) {
      briefUnsentCount += 1;
    }
  }

  return {
    eventCount: events.length,
    confirmedTotal,
    provisionalTotal,
    invoicedDeliveredTotal,
    briefUnsentCount,
  };
}
