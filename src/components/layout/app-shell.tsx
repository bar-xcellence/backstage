import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { MobileTopBar } from "./mobile-top-bar";
import { Sidebar } from "./sidebar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/signin");

  const user = {
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    isLoggedIn: session.isLoggedIn,
  };

  return (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row md:overflow-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-gold-ink focus:text-cream focus:px-4 focus:py-2 focus:font-[family-name:var(--font-raleway)] focus:text-[11px] focus:font-medium focus:tracking-[0.16em] focus:uppercase"
      >
        Skip to main content
      </a>
      <MobileTopBar user={user} />
      <Sidebar user={user} />
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 bg-cream px-4 py-8 focus:outline-none md:h-screen md:overflow-y-auto md:px-6 lg:px-8"
      >
        {children}
      </main>
    </div>
  );
}
