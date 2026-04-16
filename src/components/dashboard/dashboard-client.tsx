"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DashboardData } from "@/actions/dashboard";
import { STATUS_COLORS } from "@/lib/constants";
import { createEvent } from "@/actions/events";

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

function QuickAddForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createEvent(formData);

    if (result.errors) {
      setError(result.errors.join(", "));
      setSaving(false);
      return;
    }

    if (result.id) {
      router.push(`/events/${result.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-low p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey block mb-1">
            Event name
          </label>
          <input
            name="eventName"
            type="text"
            required
            placeholder="e.g. Specsavers Conference"
            className="w-full px-3 py-2.5 bg-cream border border-outline/15 font-[family-name:var(--font-raleway)] text-sm text-charcoal placeholder:text-grey/50 focus:outline-none focus:border-gold min-h-[44px]"
          />
        </div>
        <div>
          <label className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey block mb-1">
            Event date
          </label>
          <input
            name="eventDate"
            type="date"
            required
            className="w-full px-3 py-2.5 bg-cream border border-outline/15 font-[family-name:var(--font-raleway)] text-sm text-charcoal focus:outline-none focus:border-gold min-h-[44px]"
          />
        </div>
        <div>
          <label className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey block mb-1">
            Venue
          </label>
          <input
            name="venueName"
            type="text"
            required
            placeholder="e.g. The ICC, Birmingham"
            className="w-full px-3 py-2.5 bg-cream border border-outline/15 font-[family-name:var(--font-raleway)] text-sm text-charcoal placeholder:text-grey/50 focus:outline-none focus:border-gold min-h-[44px]"
          />
        </div>
        <div>
          <label className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey block mb-1">
            Guests
          </label>
          <input
            name="guestCount"
            type="number"
            required
            min="1"
            placeholder="e.g. 200"
            className="w-full px-3 py-2.5 bg-cream border border-outline/15 font-[family-name:var(--font-raleway)] text-sm text-charcoal placeholder:text-grey/50 focus:outline-none focus:border-gold min-h-[44px]"
          />
        </div>
      </div>
      {error && (
        <p className="font-[family-name:var(--font-raleway)] text-sm text-error">{error}</p>
      )}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 min-h-[44px] disabled:opacity-50 cursor-pointer"
        >
          {saving ? "SAVING..." : "SAVE ENQUIRY"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey hover:text-charcoal transition-colors duration-200 min-h-[44px] cursor-pointer"
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const greeting = getGreeting();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

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
      <div className="flex items-start justify-between">
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
        {!showQuickAdd && (
          <button
            onClick={() => setShowQuickAdd(true)}
            className="px-5 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 min-h-[44px] cursor-pointer flex-shrink-0"
          >
            LOG NEW ENQUIRY
          </button>
        )}
      </div>

      {/* Quick add form */}
      {showQuickAdd && (
        <QuickAddForm onCancel={() => setShowQuickAdd(false)} />
      )}

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
