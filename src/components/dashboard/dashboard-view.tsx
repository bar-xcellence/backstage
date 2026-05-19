import type { DashboardData } from "@/actions/dashboard";
import type { DashboardEventListResult } from "@/actions/dashboard";
import type { DbStatus } from "@/lib/dashboard-status";
import { DashboardClient } from "./dashboard-client";
import { ViewAsBanner } from "./view-as-banner";
import { MonthHeader } from "./month-header";
import { SummaryStrip } from "./summary-strip";
import { EventCardList } from "./event-card-list";
import { EmptyDashboard } from "./empty-dashboard";

type Props = {
  ownerData: DashboardData | null;
  eventList: DashboardEventListResult;
  month: string;
  statuses: DbStatus[];
  showViewAsBanner: boolean;
};

export function DashboardView({
  ownerData,
  eventList,
  month,
  statuses,
  showViewAsBanner,
}: Props) {
  const isGloballyEmpty = eventList.globalEventCount === 0;

  // Globally empty paths — render a single unified empty state, no month section.
  if (isGloballyEmpty) {
    if (eventList.viewerRole === "partner") {
      return (
        <>
          {showViewAsBanner && <ViewAsBanner />}
          <EmptyDashboard />
        </>
      );
    }
    // Owner with zero events: DashboardClient's own zero-state renders the welcome.
    return ownerData ? <DashboardClient data={ownerData} /> : null;
  }

  // Has at least one event — normal dashboard layout.
  return (
    <>
      {showViewAsBanner && <ViewAsBanner />}

      <div className="space-y-12">
        {ownerData && <DashboardClient data={ownerData} />}

        <section className="space-y-6">
          <MonthHeader
            month={month}
            statuses={statuses}
            eventCount={eventList.events.length}
            variant={eventList.viewerRole}
          />
          {eventList.viewerRole === "partner" ? (
            <SummaryStrip variant="partner" summary={eventList.summary} />
          ) : (
            <SummaryStrip variant="owner" summary={eventList.summary} />
          )}
        </section>

        <section>
          {eventList.viewerRole === "partner" ? (
            <EventCardList variant="partner" events={eventList.events} />
          ) : (
            <EventCardList variant="owner" events={eventList.events} />
          )}
        </section>
      </div>
    </>
  );
}
