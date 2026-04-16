import Link from "next/link";
import { createEvent } from "@/actions/events";
import { EventForm } from "@/components/events/event-form";

export default function NewEventPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/events"
          className="text-grey hover:text-charcoal text-sm transition-colors duration-200"
        >
          &larr;
        </Link>
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
          New Event
        </h1>
      </div>

      <EventForm action={createEvent} />
    </div>
  );
}
