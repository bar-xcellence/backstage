import type { PartnerEventCard } from "@/lib/partner-event-projection";
import type { OwnerEventCard } from "@/actions/dashboard";
import { formatAddressLines } from "@/lib/address-format";
import { StatusBadge } from "./status-badge";
import type { DbStatus } from "@/lib/dashboard-status";
import Link from "next/link";

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

function cardOpacityClass(status: DbStatus): string {
  if (status === "delivered") return "opacity-70";
  if (status === "cancelled") return "opacity-50";
  return "";
}

function dateClass(status: DbStatus): string {
  const base = "font-[family-name:var(--font-cormorant)] font-light text-gold";
  if (status === "cancelled") return `${base} line-through`;
  return base;
}

export function EventCard(props: Props) {
  const { event, variant } = props;
  const { day, month } = formatDateBlock(event.eventDate);
  const dbStatus = event.status as DbStatus;
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
    <div className={`bg-cream p-8 ${cardOpacityClass(dbStatus)}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={dateClass(dbStatus)}>
            <span className="text-[64px] leading-none">{day}</span>
            <span className="text-[24px] ml-2 tracking-[0.18em]">{month}</span>
          </div>
        </div>
        <StatusBadge status={dbStatus} variant={variant} />
      </div>

      <div className="mt-6 font-[family-name:var(--font-raleway)] text-charcoal">
        <p className="text-base">{formatWhatLine(event.eventType, event.guestCount)}</p>
        {event.serveCount > 0 && (
          <p className="text-base text-grey mt-1">{event.serveCount} serves</p>
        )}
      </div>

      {event.elementsSummary && (
        <div className="mt-6">
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
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
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
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

function OwnerFooter(_props: { event: OwnerEventCard }) {
  // Implemented in Task 10
  return null;
}
