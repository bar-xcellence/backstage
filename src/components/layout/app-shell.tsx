import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Sidebar } from "./sidebar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/signin");

  return (
    <div className="flex min-h-screen">
      <Sidebar user={session} />
      <main className="flex-1 bg-cream px-6 py-8 lg:px-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
