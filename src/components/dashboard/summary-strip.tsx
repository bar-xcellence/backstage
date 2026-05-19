import type { PartnerSummary, SummaryTotals } from "@/lib/dashboard-summary";

type Props =
  | { variant: "partner"; summary: PartnerSummary }
  | { variant: "owner"; summary: SummaryTotals };

function gbp(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function SummaryStrip(props: Props) {
  const { summary } = props;
  const parts: string[] = [];
  parts.push(`${gbp(summary.confirmedTotal)} confirmed`);
  if (summary.provisionalTotal > 0) {
    parts.push(`${gbp(summary.provisionalTotal)} provisional`);
  }

  const ownerLineParts: string[] = [];
  if (props.variant === "owner") {
    if (props.summary.invoicedDeliveredTotal > 0) {
      ownerLineParts.push(`${gbp(props.summary.invoicedDeliveredTotal)} invoiced this month`);
    }
    if (props.summary.briefUnsentCount > 0) {
      ownerLineParts.push(
        `${props.summary.briefUnsentCount} brief${props.summary.briefUnsentCount === 1 ? "" : "s"} unsent`
      );
    }
  }

  return (
    <div className="space-y-1 font-[family-name:var(--font-raleway)]">
      <p className="text-sm text-charcoal">{parts.join(" · ")}</p>
      {props.variant === "owner" && ownerLineParts.length > 0 && (
        <p className="text-sm text-grey">{ownerLineParts.join(" · ")}</p>
      )}
    </div>
  );
}
