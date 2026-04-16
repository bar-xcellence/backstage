import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { listEvents } from "@/actions/events";
import { EventsView } from "@/components/events/events-view";

export default async function EventsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/signin");

  const events = await listEvents();
  return <EventsView events={events} isPartner={session.role === "partner"} />;
}
