import type { DbStatus, DisplayStatus } from "@/lib/dashboard-status";
import { toPartnerStatus } from "@/lib/dashboard-status";

type Props = {
  status: DbStatus;
  variant: "partner" | "owner";
};

const PARTNER_LABELS: Record<DisplayStatus, string> = {
  provisional: "Provisional",
  confirmed: "Confirmed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const OWNER_LABELS: Record<DbStatus, string> = {
  enquiry: "Enquiry",
  confirmed: "Confirmed",
  preparation: "Preparation",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function partnerBadgeClass(display: DisplayStatus): string {
  // Reserve Noir: 0px radius, charcoal/cream/gold tokens, Raleway eyebrow.
  const base =
    "inline-flex items-center px-3 py-1.5 text-[11px] font-medium tracking-[0.18em] uppercase font-[family-name:var(--font-raleway)]";

  if (display === "provisional") {
    return `${base} border border-gold/60 text-gold opacity-60`;
  }
  if (display === "confirmed") {
    return `${base} bg-charcoal text-cream border-l-2 border-gold`;
  }
  if (display === "delivered") {
    return `${base} border border-grey text-grey`;
  }
  // cancelled
  return `${base} border border-error text-error`;
}

function ownerBadgeClass(status: DbStatus): string {
  const base =
    "inline-flex items-center px-3 py-1.5 text-[11px] font-medium tracking-[0.18em] uppercase font-[family-name:var(--font-raleway)]";

  if (status === "enquiry") {
    return `${base} border border-gold/60 text-gold opacity-60`;
  }
  if (status === "confirmed") {
    return `${base} bg-charcoal text-cream border-l-2 border-gold`;
  }
  if (status === "preparation") {
    return `${base} bg-charcoal/80 text-cream border-l-2 border-gold/80`;
  }
  if (status === "ready") {
    return `${base} bg-gold text-cream`;
  }
  if (status === "delivered") {
    return `${base} border border-grey text-grey`;
  }
  // cancelled
  return `${base} border border-error text-error`;
}

export function StatusBadge({ status, variant }: Props) {
  if (variant === "partner") {
    const display = toPartnerStatus(status);
    const label = PARTNER_LABELS[display];
    const className = partnerBadgeClass(display);
    return display === "provisional" ? (
      <span
        className={className}
        title="Client has not yet confirmed"
        aria-label={`Status: ${label} (Client has not yet confirmed)`}
      >
        {label}
      </span>
    ) : (
      <span className={className} aria-label={`Status: ${label}`}>
        {label}
      </span>
    );
  }

  // owner
  return (
    <span
      className={ownerBadgeClass(status)}
      aria-label={`Status: ${OWNER_LABELS[status]}`}
    >
      {OWNER_LABELS[status]}
    </span>
  );
}
