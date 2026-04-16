"use client";

import Link from "next/link";
import type { DashboardData } from "@/actions/dashboard";
import { STATUS_COLORS } from "@/lib/constants";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function pluralise(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function formatCountdown(daysUntil: number): string {
  if (daysUntil === 0) return "is today";
  if (daysUntil === 1) return "is tomorrow";
  return `is in ${daysUntil} days`;
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const greeting = getGreeting();

  // Zero-events empty state
  if (!data.nextEvent && data.upcoming.length === 0 && data.actions.length === 0) {
    return (
      <div className="text-center py-16 max-w-lg mx-auto">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
          {greeting}, {data.userName}.
        </h1>
        <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mt-4 leading-relaxed">
          Let&apos;s get your first event on the books. Once you create an event,
          this dashboard will show upcoming dates, action items, and revenue at a
          glance.
        </p>
        <Link
          href="/events/new"
          className="inline-block mt-8 px-6 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 min-h-[44px]"
        >
          ADD YOUR FIRST EVENT
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting + next event countdown */}
      <div>
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
          {greeting}, {data.userName}.
        </h1>
        {data.nextEvent ? (
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mt-1">
            <span className="text-charcoal font-medium">{data.nextEvent.eventName}</span>{" "}
            {formatCountdown(data.nextEvent.daysUntil)}.
          </p>
        ) : (
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mt-1">
            No upcoming events scheduled.
          </p>
        )}
      </div>

      {/* 3 metric tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Events this week */}
        <div className="bg-surface-low p-5">
          <p className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal">
            {data.eventsThisWeek}
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey mt-1">
            {pluralise(data.eventsThisWeek, "Event", "Events")} this week
          </p>
        </div>

        {/* Overdue items */}
        <div className={`p-5 ${data.overdueItems > 0 ? "bg-cognac/10" : "bg-surface-low"}`}>
          <p
            className={`font-[family-name:var(--font-cormorant)] text-3xl font-light ${
              data.overdueItems > 0 ? "text-cognac" : "text-charcoal"
            }`}
          >
            {data.overdueItems}
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey mt-1">
            {data.overdueItems === 0
              ? "Nothing overdue"
              : `Overdue ${pluralise(data.overdueItems, "item", "items")}`}
          </p>
        </div>

        {/* Revenue this month */}
        <div className="bg-surface-low p-5">
          <p className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal">
            {formatCurrency(data.revenueThisMonth)}
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey mt-1">
            Revenue this month
          </p>
        </div>
      </div>

      {/* Needs Attention — hidden when empty */}
      {data.actions.length > 0 && (
        <div>
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-charcoal tracking-tight mb-4">
            Needs Attention
          </h2>
          <div className="divide-y divide-outline/10">
            {data.actions.map((action, i) => (
              <Link
                key={`${action.eventId}-${i}`}
                href={`/events/${action.eventId}`}
                className="flex items-center gap-3 py-3 hover:bg-surface-low transition-colors duration-150"
              >
                <span className="w-2 h-2 bg-gold flex-shrink-0" />
                <span className="font-[family-name:var(--font-raleway)] text-sm">
                  <span className="font-semibold text-charcoal">{action.eventName}</span>
                  <span className="text-grey ml-2">{action.issue}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <div>
        <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-charcoal tracking-tight mb-4">
          Upcoming Events
        </h2>
        {data.upcoming.length === 0 ? (
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
            No events in the next 14 days.{" "}
            <Link href="/events/new" className="text-gold hover:text-gold-ink transition-colors duration-150">
              Add one?
            </Link>
          </p>
        ) : (
          <div className="divide-y divide-outline/10">
            {data.upcoming.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between py-3 hover:bg-surface-low transition-colors duration-150 gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-charcoal truncate">
                      {event.eventName}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium tracking-[0.16em] uppercase flex-shrink-0 ${STATUS_COLORS[event.status] || STATUS_COLORS.enquiry}`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey mt-1">
                    <span>{event.eventDate}</span>
                    <span>{event.venueName}</span>
                    <span>{event.guestCount}pp</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
