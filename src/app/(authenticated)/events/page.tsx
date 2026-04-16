import Link from "next/link";
import { listEvents } from "@/actions/events";

const STATUS_COLORS: Record<string, string> = {
  enquiry: "bg-grey/20 text-grey",
  confirmed: "bg-cognac/20 text-cognac",
  preparation: "bg-gold/20 text-gold",
  ready: "bg-botanical/20 text-botanical",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-error/10 text-error/60",
};

export default async function EventsPage() {
  const events = await listEvents();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
          Events
        </h1>
        <Link
          href="/events/new"
          className="px-6 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 min-h-[44px] flex items-center"
        >
          ADD EVENT
        </Link>
      </div>

      {/* Event list */}
      {events.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
            No events yet
          </p>
          <Link
            href="/events/new"
            className="inline-block mt-4 text-gold text-[11px] font-semibold tracking-[0.16em] uppercase hover:text-gold-ink transition-colors duration-200"
          >
            CREATE YOUR FIRST EVENT
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="block bg-cream border border-transparent hover:border-gold/40 transition-colors duration-200 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="font-[family-name:var(--font-raleway)] text-base font-semibold text-charcoal truncate">
                      {event.eventName}
                    </h2>
                    <span
                      className={`shrink-0 px-2 py-0.5 text-[10px] font-medium tracking-[0.16em] uppercase ${STATUS_COLORS[event.status] || STATUS_COLORS.enquiry}`}
                    >
                      {event.status}
                    </span>
                  </div>
                  {event.showName && (
                    <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mt-0.5">
                      {event.showName}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey">
                    <span>{event.eventDate}</span>
                    <span>{event.venueName}</span>
                    <span>{event.guestCount} guests</span>
                  </div>
                </div>
                {event.lcSentAt && (
                  <span className="shrink-0 text-[10px] font-medium tracking-[0.16em] uppercase text-success">
                    SENT TO LC
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
