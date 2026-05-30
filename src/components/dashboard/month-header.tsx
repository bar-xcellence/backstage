import { MonthSelect } from "./month-select";
import { StatusChips } from "./status-chips";
import type { DbStatus } from "@/lib/dashboard-status";

function monthLabel(ym: string): string {
  if (ym === "upcoming") return "All upcoming";
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(d)
    .toUpperCase();
}

export function MonthHeader({
  month,
  statuses,
  eventCount,
  variant,
}: {
  month: string;
  statuses: DbStatus[];
  eventCount: number;
  variant: "partner" | "owner";
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-ink">
        {monthLabel(month)} · {eventCount} {eventCount === 1 ? "event" : "events"}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <MonthSelect value={month} />
        <StatusChips variant={variant} selectedStatuses={statuses} />
      </div>
    </div>
  );
}
