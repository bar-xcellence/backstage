import type { PartnerEventCard } from "@/lib/partner-event-projection";
import type { OwnerEventCard } from "@/actions/dashboard";
import { formatAddressLines } from "@/lib/address-format";
import { StatusBadge } from "./status-badge";
import type { DbStatus, DisplayStatus } from "@/lib/dashboard-status";
import { daysUntil } from "@/lib/event-countdown";
import Link from "next/link";

type AnyStatus = DbStatus | DisplayStatus;

type Props =
  | { variant: "partner"; event: PartnerEventCard }
  | { variant: "owner"; event: OwnerEventCard };

function formatDateBlock(eventDate: string): { day: string; month: string } {
  // eventDate is YYYY-MM-DD
  const [, mStr, dStr] = eventDate.split("-");
  const day = String(Number(dStr));
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const month = months[Number(mStr) - 1];
  return { day, month };
}

const EVENT_TYPE_PHRASE: Record<string, string> = {
  masterclass: "Masterclass",
  drinks_reception: "Drinks reception",
  team_building: "Team-building event",
  corporate: "Corporate event",
  exhibition: "Exhibition",
  other: "Event",
};

function formatWhatLine(eventType: string | null, guestCount: number): string {
  const phrase = eventType ? (EVENT_TYPE_PHRASE[eventType] ?? "Event") : "Event";
  return `${phrase} for ${guestCount} guests`;
}

function formatPayout(s: string | null): string | null {
  if (s === null) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function cardOpacityClass(status: AnyStatus): string {
  if (status === "delivered") return "opacity-70";
  if (status === "cancelled") return "opacity-50";
  return "";
}

function dateClass(status: AnyStatus): string {
  const base = "font-[family-name:var(--font-cormorant)] font-light text-gold-ink";
  if (status === "cancelled") return `${base} line-through`;
  return base;
}

export function EventCard(props: Props) {
  const { event, variant } = props;
  const { day, month } = formatDateBlock(event.eventDate);
  const status = event.status;
  const addressLines = formatAddressLines({
    venueName: event.venueName,
    venueTenant: event.venueTenant,
    cateringPartner: event.cateringPartner,
    venueHallRoom: event.venueHallRoom,
    addressLine1: event.addressLine1,
    addressLine2: event.addressLine2,
    city: event.city,
    postcode: event.postcode,
  });

  const body = (
    <div className={`bg-cream p-8 ${cardOpacityClass(status)}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={dateClass(status)}>
            <span className="text-[64px] leading-none">{day}</span>
            <span className="text-[24px] ml-2 tracking-[0.18em]">{month}</span>
          </div>
        </div>
        {props.variant === "partner" ? (
          <StatusBadge status={props.event.status} variant="partner" />
        ) : (
          <StatusBadge status={props.event.status as DbStatus} variant="owner" />
        )}
      </div>

      <div className="mt-6 font-[family-name:var(--font-raleway)] text-charcoal">
        <p className="text-base">{formatWhatLine(event.eventType, event.guestCount)}</p>
        {event.serveCount > 0 && (
          <p className="text-base text-grey mt-1">{event.serveCount} serves</p>
        )}
      </div>

      {event.elementsSummary && (
        <div className="mt-6">
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-ink">
            Elements
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-sm text-charcoal mt-2 leading-relaxed">
            {event.elementsSummary}
          </p>
        </div>
      )}

      <div className="mt-6 font-[family-name:var(--font-raleway)] text-sm text-grey leading-relaxed">
        {addressLines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {event.lcPayout && (
        <div className="mt-8">
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-ink">
            LC Payout
          </p>
          <p className="font-[family-name:var(--font-cormorant)] text-[36px] font-light text-charcoal mt-1">
            {formatPayout(event.lcPayout)}
          </p>
          {event.commissionNote && (
            <p className="font-[family-name:var(--font-raleway)] text-[13px] text-grey mt-2">
              + {event.commissionNote}
            </p>
          )}
        </div>
      )}

      {variant === "owner" && <OwnerFooter event={props.event} />}
    </div>
  );

  if (variant === "owner") {
    return (
      <Link
        href={`/events/${event.id}`}
        className="block hover:outline hover:outline-2 hover:outline-gold/40 transition-[outline-color] duration-200"
      >
        {body}
      </Link>
    );
  }

  return body;
}

function formatMoney(s: string | null): string {
  if (s === null) return "—";
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMargin(invoice: string | null, cost: string | null): string {
  if (invoice === null || cost === null) return "—";
  const i = parseFloat(invoice);
  const c = parseFloat(cost);
  if (!Number.isFinite(i) || !Number.isFinite(c)) return "—";
  return formatMoney(String(i - c));
}

function countdownLabel(eventDate: string, status: DbStatus): {
  text: string;
  urgent: boolean;
} {
  if (status === "delivered" || status === "cancelled") {
    return { text: status === "delivered" ? "DELIVERED" : "CANCELLED", urgent: false };
  }
  const n = daysUntil(eventDate);
  if (n < 0) return { text: "PAST", urgent: true };
  if (n === 0) return { text: "TODAY", urgent: true };
  return { text: `T-${n} DAYS`, urgent: n <= 7 };
}

function briefStatusLabel(
  status: DbStatus,
  lcSentAt: Date | null
): { text: string; urgent: boolean } {
  if (status === "enquiry") return { text: "—", urgent: false };
  if (lcSentAt) {
    const d = new Date(lcSentAt);
    const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d);
    return { text: `sent ${fmt}`, urgent: false };
  }
  return { text: "Not sent", urgent: true };
}

function OwnerFooter({ event }: { event: OwnerEventCard }) {
  const countdown = countdownLabel(event.eventDate as string, event.status as DbStatus);
  const brief = briefStatusLabel(event.status as DbStatus, event.lcSentAt);
  const checklistUrgent =
    event.checklistTotal > 0 &&
    event.checklistComplete < event.checklistTotal &&
    daysUntil(event.eventDate as string) <= 2 &&
    daysUntil(event.eventDate as string) >= 0;

  return (
    <div className="mt-8 bg-surface-low p-6">
      {/* 4 figures, two columns on mobile, four on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
        <div>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-ink">
            Invoice
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-base font-semibold text-charcoal mt-1">
            {formatMoney(event.invoiceAmount)}
          </p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-ink">
            Cost
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-base font-semibold text-charcoal mt-1">
            {formatMoney(event.costAmount)}
          </p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-ink">
            Margin
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-base font-semibold text-charcoal mt-1">
            {formatMargin(event.invoiceAmount, event.costAmount)}
          </p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-ink">
            Payout
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-base font-semibold text-charcoal mt-1">
            {formatMoney(event.lcPayout)}
          </p>
        </div>
      </div>

      {/* Brief, checklist, countdown */}
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 font-[family-name:var(--font-raleway)] text-[13px]">
          <span className={"text-gold-ink font-semibold"}>
            Brief: {brief.text}
          </span>
          <span className={"text-gold-ink font-semibold"}>
            Checklist: {event.checklistTotal === 0
              ? "—"
              : `${event.checklistComplete} / ${event.checklistTotal}`}
          </span>
        </div>
        <span
          className={`font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase ${
            "text-gold-ink"
          }`}
        >
          {countdown.text}
        </span>
      </div>
    </div>
  );
}
