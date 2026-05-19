import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getDashboardData, getDashboardEvents } from "@/actions/dashboard";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { parseFilters, resolveEffectiveRole, type Role } from "@/lib/dashboard-filters";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; statuses?: string; viewAs?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/signin");

  const sessionRole = session.role as Role;
  const params = await searchParams;
  const effectiveRole = resolveEffectiveRole(sessionRole, params.viewAs);
  const filters = parseFilters(params, effectiveRole);

  const eventList = await getDashboardEvents({
    month: params.month,
    statuses: params.statuses,
    viewAs: params.viewAs,
  });

  // Owner data (KPI strip + actions queue) only for real owner/super_admin viewers.
  // Skipped when in view-as-partner mode so partner-effective rendering stays pure.
  const ownerData =
    effectiveRole === "partner" ? null : await getDashboardData();

  const showViewAsBanner =
    sessionRole !== "partner" && effectiveRole === "partner";

  return (
    <DashboardView
      ownerData={ownerData}
      eventList={eventList}
      month={filters.month}
      statuses={filters.statuses}
      showViewAsBanner={showViewAsBanner}
    />
  );
}
