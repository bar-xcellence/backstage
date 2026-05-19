import type { SummaryTotals } from "@/lib/dashboard-summary";

function gbp(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function SummaryStrip({
  summary,
  variant,
}: {
  summary: SummaryTotals;
  variant: "partner" | "owner";
}) {
  const parts: string[] = [];
  parts.push(`${gbp(summary.confirmedTotal)} confirmed`);
  if (summary.provisionalTotal > 0) {
    parts.push(`${gbp(summary.provisionalTotal)} provisional`);
  }

  const ownerLineParts: string[] = [];
  if (variant === "owner") {
    if (summary.invoicedDeliveredTotal > 0) {
      ownerLineParts.push(`${gbp(summary.invoicedDeliveredTotal)} invoiced this month`);
    }
    if (summary.briefUnsentCount > 0) {
      ownerLineParts.push(
        `${summary.briefUnsentCount} brief${summary.briefUnsentCount === 1 ? "" : "s"} unsent`
      );
    }
  }

  return (
    <div className="space-y-1 font-[family-name:var(--font-raleway)]">
      <p className="text-sm text-charcoal">{parts.join(" · ")}</p>
      {variant === "owner" && ownerLineParts.length > 0 && (
        <p className="text-sm text-grey">{ownerLineParts.join(" · ")}</p>
      )}
    </div>
  );
}
