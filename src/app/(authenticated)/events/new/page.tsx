import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { createEvent } from "@/actions/events";
import { EventForm } from "@/components/events/event-form";

export default async function NewEventPage() {
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  if (session.role === "partner") redirect("/events");

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
