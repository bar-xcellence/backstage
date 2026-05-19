import type { PartnerEventCard } from "@/lib/partner-event-projection";
import type { OwnerEventCard } from "@/actions/dashboard";
import { EventCard } from "./event-card";
import Link from "next/link";

type Props =
  | { variant: "partner"; events: PartnerEventCard[] }
  | { variant: "owner"; events: OwnerEventCard[]; allowCreate: boolean };

export function EventCardList(props: Props) {
  const { events, variant } = props;

  if (events.length === 0) {
    if (variant === "owner" && props.allowCreate) {
      return (
        <div className="text-center py-16">
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-charcoal">
            No events yet.
          </h2>
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mt-2">
            Create your first event to see it appear here.
          </p>
          <Link
            href="/events/new"
            className="inline-block mt-6 px-6 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 min-h-[44px]"
          >
            CREATE EVENT
          </Link>
        </div>
      );
    }
    return (
      <div className="text-center py-16">
        <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-charcoal">
          No events in this window.
        </h2>
        <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mt-2">
          Adjust the month or status filter to see more.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto space-y-8">
      {variant === "partner"
        ? events.map((e) => <EventCard key={e.id} variant="partner" event={e} />)
        : events.map((e) => <EventCard key={e.id} variant="owner" event={e} />)}
    </div>
  );
}
