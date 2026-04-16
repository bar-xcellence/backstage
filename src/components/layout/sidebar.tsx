"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/actions/auth";
import type { SessionData } from "@/lib/auth-config";

interface NavItem {
  label: string;
  href: string;
}

const ownerNav: NavItem[] = [
  { label: "DASHBOARD", href: "/" },
  { label: "EVENTS", href: "/events" },
  { label: "RECIPES", href: "/recipes" },
];

const partnerNav: NavItem[] = [
  { label: "EVENTS", href: "/events" },
  { label: "RECIPES", href: "/recipes" },
];

export function Sidebar({ user }: { user: SessionData }) {
  const pathname = usePathname();
  const nav = user.role === "partner" ? partnerNav : ownerNav;

  return (
    <aside className="w-64 bg-charcoal min-h-screen flex flex-col justify-between py-6 px-4 shrink-0">
      <div>
        {/* Brand */}
        <div className="px-2 mb-10">
          <h2 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-cream tracking-tight">
            Bar Excellence
          </h2>
          <p className="font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.18em] uppercase text-grey mt-1">
            Premium Hospitality
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {nav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2.5 font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 min-h-[44px] ${
                  isActive
                    ? "bg-gold/10 text-gold border-l-2 border-gold"
                    : "text-grey hover:text-cream hover:bg-cream/5 border-l-2 border-transparent"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User info + sign out */}
      <div className="px-2">
        <p className="font-[family-name:var(--font-raleway)] text-sm text-cream">
          {user.name}
        </p>
        <p className="font-[family-name:var(--font-raleway)] text-[10px] tracking-[0.18em] uppercase text-grey mt-0.5">
          {user.role === "partner"
            ? "LC Partner"
            : user.role === "owner"
              ? "Owner"
              : "Admin"}
        </p>
        <form action={signOut} className="mt-4">
          <button
            type="submit"
            className="text-grey text-[10px] font-medium tracking-[0.16em] uppercase hover:text-cream transition-colors duration-200 cursor-pointer"
          >
            SIGN OUT
          </button>
        </form>
      </div>
    </aside>
  );
}
