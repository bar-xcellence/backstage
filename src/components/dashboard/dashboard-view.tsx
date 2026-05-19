import type { DashboardData } from "@/actions/dashboard";
import type { DashboardEventListResult } from "@/actions/dashboard";
import type { DbStatus } from "@/lib/dashboard-status";
import { DashboardClient } from "./dashboard-client";
import { ViewAsBanner } from "./view-as-banner";
import { MonthHeader } from "./month-header";
import { SummaryStrip } from "./summary-strip";
import { EventCardList } from "./event-card-list";

type Props = {
  ownerData: DashboardData | null;        // null for partner view
  eventList: DashboardEventListResult;
  month: string;
  statuses: DbStatus[];
  showViewAsBanner: boolean;
  allowCreate: boolean;                   // true only for real owner (not view-as)
};

export function DashboardView({
  ownerData,
  eventList,
  month,
  statuses,
  showViewAsBanner,
  allowCreate,
}: Props) {
  return (
    <>
      {showViewAsBanner && <ViewAsBanner />}

      <div className="space-y-12">
        {/* Owner-only top half */}
        {ownerData && <DashboardClient data={ownerData} />}

        {/* Month-of-cards (both roles) */}
        <section className="space-y-6">
          <MonthHeader
            month={month}
            statuses={statuses}
            eventCount={eventList.events.length}
            variant={eventList.viewerRole}
          />
          <SummaryStrip summary={eventList.summary} variant={eventList.viewerRole} />
        </section>

        <section>
          {eventList.viewerRole === "partner" ? (
            <EventCardList variant="partner" events={eventList.events} />
          ) : (
            <EventCardList
              variant="owner"
              events={eventList.events}
              allowCreate={allowCreate}
            />
          )}
        </section>
      </div>
    </>
  );
}
