import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent, updateEvent, updateEventStatus } from "@/actions/events";
import { EventForm } from "@/components/events/event-form";

const STATUS_COLORS: Record<string, string> = {
  enquiry: "bg-grey/20 text-grey",
  confirmed: "bg-cognac/20 text-cognac",
  preparation: "bg-gold/20 text-gold",
  ready: "bg-botanical/20 text-botanical",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-error/10 text-error/60",
};

const STATUS_ORDER = [
  "enquiry",
  "confirmed",
  "preparation",
  "ready",
  "delivered",
];

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) notFound();

  const updateWithId = async (formData: FormData) => {
    "use server";
    return updateEvent(id, formData);
  };

  const advanceStatus = async () => {
    "use server";
    const currentIndex = STATUS_ORDER.indexOf(event.status);
    if (currentIndex < STATUS_ORDER.length - 1) {
      await updateEventStatus(id, STATUS_ORDER[currentIndex + 1]);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/events"
            className="text-grey hover:text-charcoal text-sm transition-colors duration-200"
          >
            &larr;
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
                {event.eventName}
              </h1>
              <span
                className={`px-2 py-0.5 text-[10px] font-medium tracking-[0.16em] uppercase ${STATUS_COLORS[event.status] || STATUS_COLORS.enquiry}`}
              >
                {event.status}
              </span>
            </div>
            {event.showName && (
              <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mt-1">
                {event.showName}
              </p>
            )}
          </div>
        </div>

        {/* Status advance button */}
        {STATUS_ORDER.indexOf(event.status) < STATUS_ORDER.length - 1 && (
          <form action={advanceStatus}>
            <button
              type="submit"
              className="px-6 py-2.5 border border-gold text-gold font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold hover:text-cream transition-colors duration-200 min-h-[44px] cursor-pointer"
            >
              ADVANCE TO{" "}
              {STATUS_ORDER[
                STATUS_ORDER.indexOf(event.status) + 1
              ].toUpperCase()}
            </button>
          </form>
        )}
      </div>

      {/* Event summary bar */}
      <div className="flex items-center gap-6 py-4 mb-8 border-b border-outline/15 font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey">
        <span>{event.eventDate}</span>
        <span>{event.venueName}</span>
        {event.venueHallRoom && <span>{event.venueHallRoom}</span>}
        <span>{event.guestCount} guests</span>
        {event.prepaidServes && <span>{event.prepaidServes} serves</span>}
        {event.stationCount && (
          <span>{event.stationCount} stations</span>
        )}
        {event.lcSentAt && (
          <span className="text-success">
            SENT TO LC {new Date(event.lcSentAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Edit form */}
      <EventForm
        action={updateWithId}
        defaultValues={event as Record<string, string | number | null>}
        submitLabel="SAVE CHANGES"
      />
    </div>
  );
}
