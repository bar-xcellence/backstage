import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/actions/dashboard";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  if (session.role === "partner") redirect("/events");

  const data = await getDashboardData();
  return <DashboardClient data={data} />;
}
