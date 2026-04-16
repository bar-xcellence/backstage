import { redirect } from "next/navigation";

// Phase 1: redirect to events. Phase 2 adds the full dashboard.
export default function DashboardPage() {
  redirect("/events");
}
