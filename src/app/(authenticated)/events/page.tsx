import { listEvents } from "@/actions/events";
import { EventsView } from "@/components/events/events-view";

export default async function EventsPage() {
  const events = await listEvents();
  return <EventsView events={events} />;
}
