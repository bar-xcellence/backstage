"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/actions/auth";
import type { SessionData } from "@/lib/auth-config";
import {
  DashboardIcon,
  EventsIcon,
  HamburgerIcon,
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

export function MobileTopBar({ user }: { user: SessionData }) {
  const [open, setOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const nav = user.role === "partner" ? partnerNav : ownerNav;
  const roleLabel =
    user.role === "partner"
      ? "LC Partner"
      : user.role === "owner"
        ? "Owner"
        : "Admin";

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Body scroll lock + ESC + focus trap while open
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !overlayRef.current) return;

      const focusables = overlayRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active || !overlayRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);

    // Focus the first nav link inside the overlay
    const firstLink = overlayRef.current?.querySelector<HTMLElement>("a");
    firstLink?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    hamburgerRef.current?.focus();
  };

  return (
    <>
      <header
        role="banner"
        className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 bg-charcoal px-4"
      >
        <button
          ref={hamburgerRef}
          type="button"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="mobile-nav-overlay"
          onClick={() => setOpen(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-cream cursor-pointer"
        >
          <HamburgerIcon />
        </button>
        <h1 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-cream tracking-tight">
          Bar Excellence
        </h1>
        <div
          aria-label={`Signed in as ${user.name}`}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <span
            aria-hidden="true"
            className="w-9 h-9 bg-gold/20 text-gold flex items-center justify-center font-[family-name:var(--font-raleway)] text-xs font-medium tracking-[0.1em] uppercase"
          >
            {user.name.charAt(0)}
          </span>
        </div>
      </header>

      {open && (
        <div
          id="mobile-nav-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="md:hidden fixed inset-0 z-40"
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={close}
            className="absolute inset-0 bg-black/40 cursor-pointer"
          />
          <div
            ref={overlayRef}
            className="relative w-72 max-w-[85vw] h-full bg-charcoal/85 backdrop-blur-[20px] flex flex-col justify-between py-6 px-4 animate-[slideIn_0.2s_var(--ease-luxury)]"
          >
            <div>
              <div className="px-2 mb-10">
                <h2 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-cream tracking-tight">
                  Bar Excellence
                </h2>
                <p className="font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.18em] uppercase text-grey mt-1">
                  Premium Hospitality
                </p>
              </div>
              <nav aria-label="Main navigation" className="space-y-1">
                {nav.map(({ label, href, Icon }) => {
                  const isActive =
                    href === "/" ? pathname === "/" : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 min-h-[44px] ${
                        isActive
                          ? "bg-gold/10 text-gold border-l-2 border-gold"
                          : "text-grey hover:text-cream hover:bg-cream/5 border-l-2 border-transparent"
                      }`}
                    >
                      <Icon className="shrink-0" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="px-2">
              <p className="font-[family-name:var(--font-raleway)] text-sm text-cream">
                {user.name}
              </p>
              <p className="font-[family-name:var(--font-raleway)] text-[10px] tracking-[0.18em] uppercase text-grey mt-0.5">
                {roleLabel}
              </p>
              <form action={signOut} className="mt-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 text-grey text-[10px] font-medium tracking-[0.16em] uppercase hover:text-cream transition-colors duration-200 cursor-pointer min-h-[44px]"
                >
                  <SignOutIcon />
                  SIGN OUT
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
