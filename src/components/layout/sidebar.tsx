"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/actions/auth";
import type { SessionData } from "@/lib/auth-config";
import {
  DashboardIcon,
  EventsIcon,
  RecipesIcon,
  SignOutIcon,
} from "./nav-icons";

interface NavItem {
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const ownerNav: NavItem[] = [
  { label: "DASHBOARD", href: "/", Icon: DashboardIcon },
  { label: "EVENTS", href: "/events", Icon: EventsIcon },
  { label: "RECIPES", href: "/recipes", Icon: RecipesIcon },
];

const partnerNav: NavItem[] = [
  { label: "EVENTS", href: "/events", Icon: EventsIcon },
  { label: "RECIPES", href: "/recipes", Icon: RecipesIcon },
];

export function Sidebar({ user }: { user: SessionData }) {
  const pathname = usePathname();
  const nav = user.role === "partner" ? partnerNav : ownerNav;
  const roleLabel =
    user.role === "partner"
      ? "LC Partner"
      : user.role === "owner"
        ? "Owner"
        : "Admin";

  return (
    <aside
      aria-label="Main navigation"
      className="hidden md:flex w-16 lg:w-64 bg-charcoal min-h-screen flex-col justify-between py-6 px-2 lg:px-4 shrink-0"
    >
      <div>
        {/* Brand — full on lg, hidden on md */}
        <div className="hidden lg:block px-2 mb-10">
          <h2 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-cream tracking-tight">
            Bar Excellence
          </h2>
          <p className="font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.18em] uppercase text-grey mt-1">
            Premium Hospitality
          </p>
        </div>
        {/* Spacer to keep nav vertical position consistent with desktop */}
        <div className="lg:hidden h-10 mb-4" aria-hidden="true" />

        <nav className="space-y-1">
          {nav.map(({ label, href, Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`group relative flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 min-h-[44px] ${
                  isActive
                    ? "bg-gold/10 text-gold border-l-2 border-gold"
                    : "text-grey hover:text-cream hover:bg-cream/5 border-l-2 border-transparent"
                }`}
              >
                <Icon className="shrink-0" />
                <span className="hidden lg:inline">{label}</span>
                {/* Tablet tooltip (lg:hidden) — visible on hover/focus via group- modifiers */}
                <span
                  aria-hidden="true"
                  className="lg:hidden absolute left-full ml-3 px-3 py-1 bg-charcoal text-cream text-[11px] tracking-[0.16em] whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-events-none transition-opacity duration-150 z-50"
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-2">
        <div className="hidden lg:block">
          <p className="font-[family-name:var(--font-raleway)] text-sm text-cream">
            {user.name}
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-[10px] tracking-[0.18em] uppercase text-grey mt-0.5">
            {roleLabel}
          </p>
        </div>
        <form action={signOut} className="mt-4 flex lg:block justify-center">
          <button
            type="submit"
            aria-label="Sign out"
            className="flex items-center justify-center lg:justify-start text-grey text-[10px] font-medium tracking-[0.16em] uppercase hover:text-cream transition-colors duration-200 cursor-pointer min-h-[44px] min-w-[44px]"
          >
            <span className="hidden lg:inline">SIGN OUT</span>
            <SignOutIcon className="lg:hidden" />
          </button>
        </form>
      </div>
    </aside>
  );
}
