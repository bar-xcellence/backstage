"use client";

import Link from "next/link";
import { useViewMode, ViewToggle } from "./view-toggle";
import { EventKanban } from "./event-kanban";
import { EventDataTable } from "./event-data-table";

interface EventRow {
  id: string;
  eventName: string;
  showName: string | null;
  eventDate: string;
  venueName: string;
  guestCount: number;
  status: string;
  lcSentAt: Date | null;
}

export function EventsView({ events }: { events: EventRow[] }) {
  const [viewMode, setViewMode] = useViewMode();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
          Events
        </h1>
        <div className="flex items-center gap-3">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <Link
            href="/events/new"
            className="px-6 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 min-h-[44px] flex items-center"
          >
            ADD EVENT
          </Link>
        </div>
      </div>

      {/* Content */}
      {events.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-charcoal">
            No events yet
          </h2>
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mt-2 max-w-md mx-auto">
            Create your first event to get started with Backstage.
          </p>
          <Link
            href="/events/new"
            className="inline-block mt-6 px-6 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 min-h-[44px]"
          >
            CREATE YOUR FIRST EVENT
          </Link>
        </div>
      ) : viewMode === "kanban" ? (
        <EventKanban events={events} />
      ) : (
        <EventDataTable events={events} />
      )}
    </div>
  );
}
