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
