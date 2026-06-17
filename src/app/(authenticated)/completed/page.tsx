import { listEvents } from "@/actions/events";
import { EventsView } from "@/components/events/events-view";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function CompletedEventsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/signin");

  const events = await listEvents({ status: "completed" });

  return (
    <EventsView
      events={events}
      isPartner={session.role === "partner"}
      title="Completed"
      lockedViewMode="list"
      emptyTitle="No completed events yet"
      emptyDescription="Completed events will appear here after you open an event detail page and click MARK AS COMPLETED."
    />
  );
}
