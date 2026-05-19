import type { PartnerEventCard } from "@/lib/partner-event-projection";
import type { OwnerEventCard } from "@/actions/dashboard";
import { EventCard } from "./event-card";

type Props =
  | { variant: "partner"; events: PartnerEventCard[] }
  | { variant: "owner"; events: OwnerEventCard[] };

export function EventCardList(props: Props) {
  const { events, variant } = props;

  if (events.length === 0) {
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
