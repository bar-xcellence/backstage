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
    <div className="flex flex-col md:flex-row min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-gold focus:text-charcoal focus:px-4 focus:py-2 focus:font-[family-name:var(--font-raleway)] focus:text-[11px] focus:font-medium focus:tracking-[0.16em] focus:uppercase"
      >
        Skip to main content
      </a>
      <MobileTopBar user={user} />
      <Sidebar user={user} />
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 bg-cream px-4 md:px-6 py-8 lg:px-8 overflow-auto focus:outline-none"
      >
        {children}
      </main>
    </div>
  );
}
