# Responsive Layout + Accessibility Retrofit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Implementation status (2026-04-16):** Tasks 1–6 are implemented in the repo; Task 7 (`tsc`, Vitest, `next build`) is green; Task 9 (`TODOS.md` cleanup) is done in commit `2e227da`. **Task 8 (manual QA)** — breakpoints, keyboard-only pass, VoiceOver, axe — still needs a human pass; tick those checkboxes when verified.

**Goal:** Ship three responsive layout modes (mobile top-bar + overlay, tablet icon-only sidebar, desktop sidebar) and retrofit ARIA landmarks, skip-nav, focus-visible styling, and EventTabs keyboard navigation — without introducing new runtime dependencies.

**Architecture:** CSS does the bulk of the breakpoint work via Tailwind's `md:` and `lg:` prefixes — a single `Sidebar` component covers desktop (≥1024px) and tablet (768-1023px). A new `MobileTopBar` client component owns hamburger-overlay state for `<768px`, with ESC / backdrop / nav-click / route-change close behavior and a hand-rolled focus trap. Inline SVG constants replace any icon-library dependency. `EventTabs` picks up the WAI-ARIA automatic-activation tab pattern (arrow keys move focus *and* activate). A single global `*:focus-visible` rule in `globals.css` closes the focus-ring requirement for every interactive element in the app.

**Testing approach:** Per the design spec, no unit tests for this slice — the current Vitest setup is `environment: "node"` with no RTL / jsdom / happy-dom, and adding them for one feature is infrastructure sprawl for a 3-user app. Verification is the manual QA protocol in Task 8 (breakpoint pass, keyboard pass, screen-reader spot-check, axe audit). Existing tests must continue to pass (Task 7).

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript 5, Tailwind v4, Vitest 3.

**Design spec:** `docs/superpowers/specs/2026-04-16-responsive-layout-and-accessibility-design.md`

---

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/components/layout/nav-icons.tsx` | Inline SVG constants: `DashboardIcon`, `EventsIcon`, `RecipesIcon`, `HamburgerIcon`, `SignOutIcon`. 20×20, stroke-width 1.5, `currentColor`. |
| Modify | `src/app/globals.css` | Append `*:focus-visible` rule and `slideIn` keyframe. |
| Modify | `src/components/layout/sidebar.tsx` | Responsive width (`w-16 lg:w-64`), icons always visible, labels `hidden lg:inline`, tablet tooltip (CSS-only), `aria-label`, icon-only sign-out at tablet. Hidden below `md`. |
| Create | `src/components/layout/mobile-top-bar.tsx` | 56px top bar (hamburger + brand + avatar), overlay with glass texture, focus trap, ESC/backdrop/nav-click/route-change close. Visible only below `md`. |
| Modify | `src/components/layout/app-shell.tsx` | Skip-nav anchor, `<MobileTopBar>` alongside `<Sidebar>`, `<main id="main" tabIndex={-1}>`. Stays a server component. |
| Modify | `src/components/events/event-tabs.tsx` | ARIA `tablist` / `tab` / `tabpanel` roles, roving `tabIndex`, arrow-key handler with wrap + `Home`/`End`. |
| Modify | `TODOS.md` | Remove completed items (responsive sidebar + accessibility retrofit) and strike the already-shipped brief preview slide-over. |

---

## Task 1: Create nav-icons module

**Files:**
- Create: `src/components/layout/nav-icons.tsx`

Five inline SVGs, sharing a common `IconProps` shape and `currentColor` fill/stroke so they inherit `text-gold` / `text-grey` / `text-cream` from parent classes. Each exported as a named React component.

- [ ] **Step 1: Create the file**

```tsx
// src/components/layout/nav-icons.tsx
type IconProps = {
  className?: string;
};

const baseProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <rect x="2.5" y="2.5" width="6" height="6" />
      <rect x="11.5" y="2.5" width="6" height="6" />
      <rect x="2.5" y="11.5" width="6" height="6" />
      <rect x="11.5" y="11.5" width="6" height="6" />
    </svg>
  );
}

export function EventsIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <rect x="2.5" y="4" width="15" height="13.5" />
      <line x1="2.5" y1="8" x2="17.5" y2="8" />
      <line x1="6" y1="2.5" x2="6" y2="5.5" />
      <line x1="14" y1="2.5" x2="14" y2="5.5" />
    </svg>
  );
}

export function RecipesIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M4 3.5 H14.5 A1.5 1.5 0 0 1 16 5 V17 H5.5 A1.5 1.5 0 0 1 4 15.5 Z" />
      <path d="M4 15.5 A1.5 1.5 0 0 1 5.5 14 H16" />
      <line x1="7" y1="7" x2="13" y2="7" />
      <line x1="7" y1="10" x2="13" y2="10" />
    </svg>
  );
}

export function HamburgerIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <line x1="3" y1="6" x2="17" y2="6" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="14" x2="17" y2="14" />
    </svg>
  );
}

export function SignOutIcon({ className }: IconProps) {
  return (
    <svg {...baseProps} className={className}>
      <path d="M8 3.5 H4.5 A1.5 1.5 0 0 0 3 5 V15 A1.5 1.5 0 0 0 4.5 16.5 H8" />
      <line x1="9" y1="10" x2="17" y2="10" />
      <polyline points="14,7 17,10 14,13" />
    </svg>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors (the file has no dependencies beyond React).

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/nav-icons.tsx
git commit -m "feat: inline SVG nav icons (dashboard, events, recipes, hamburger, sign-out)"
```

---

## Task 2: Append focus-visible rule and slideIn keyframe to globals.css

**Files:**
- Modify: `src/app/globals.css`

Adds two things at the end of the file:
1. A global `*:focus-visible` rule (2px gold outline, 2px offset) — this closes the focus-ring requirement for every interactive element in the app, not just the ones we touch in this plan.
2. A `slideIn` keyframe used by the mobile overlay in Task 4.

- [ ] **Step 1: Append to the end of `src/app/globals.css`**

Use the Edit tool to append — the old_string is the last line of the file (`}` closing the `body` block), new_string is the same `}` followed by the new rules.

```css
body {
  background: var(--color-cream);
  color: var(--color-gold-ink);
  font-family: var(--font-family-raleway);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Focus-visible ring — Reserve Noir gold, 2px offset, applies to every interactive element */
*:focus-visible {
  outline: 2px solid var(--color-gold);
  outline-offset: 2px;
}

/* Mobile nav overlay slide-in */
@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
```

- [ ] **Step 2: Verify the dev server rebuilds without error**

Start the dev server: `npm run dev`
Load `http://localhost:3000`. Tab once into the page. Confirm a gold outline appears on the first focusable element. Stop the server (`Ctrl-C`).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: global focus-visible ring + slideIn keyframe for mobile nav overlay"
```

---

## Task 3: Responsive Sidebar with icons, tablet tooltips, and ARIA label

**Files:**
- Modify: `src/components/layout/sidebar.tsx` (full replacement)

Replace the existing file contents with the version below. Changes vs. the existing file:
- `aria-label="Main navigation"` on the `<aside>`.
- `hidden md:flex` on the `<aside>` so it's absent below tablet (mobile uses `MobileTopBar` from Task 4).
- `w-16 lg:w-64` — icon-only at tablet, full-width at desktop.
- New icon column: each nav item renders its icon, with label `hidden lg:inline`.
- CSS-only tooltip per nav item, visible only at tablet (`lg:hidden`) and appearing on `group-hover` or `group-focus-visible`.
- `aria-label={label}` on each `<Link>` so screen readers always announce the full label, even when the visible span is hidden.
- Brand block hidden at tablet; a spacer keeps the nav vertical offset consistent.
- User info block hidden at tablet. Sign-out button keeps a 44px minimum target and swaps text ("SIGN OUT") for an icon (`SignOutIcon`) at tablet, with an accessible name via `aria-label`.

- [ ] **Step 1: Replace `src/components/layout/sidebar.tsx` with the new version**

```tsx
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
                  role="tooltip"
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: responsive sidebar — icon-only at tablet, labels at desktop, aria-label + tooltips"
```

---

## Task 4: Create MobileTopBar with hamburger overlay and focus trap

**Files:**
- Create: `src/components/layout/mobile-top-bar.tsx`

A `<header role="banner">` visible only below `md`. State lives in-component. Behavior summary:

- Hamburger button (44×44 target) toggles the overlay open.
- When open: `body { overflow: hidden }`, focus moves to first nav link, focus is trapped in the overlay on Tab/Shift-Tab wrap.
- ESC closes + returns focus to hamburger.
- Clicking the backdrop (area behind the glass panel) closes + returns focus to hamburger.
- Clicking a nav `<Link>` closes before navigation completes.
- `usePathname` effect closes on route change (defence for programmatic navigation).

The overlay uses the Reserve Noir glass-texture token (`#1E1F2E` at 85%, `backdrop-blur-[20px]`) and the `slideIn` keyframe from Task 2.

- [ ] **Step 1: Create the file**

```tsx
// src/components/layout/mobile-top-bar.tsx
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
      const active = document.activeElement;

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
          aria-label="Main navigation"
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/mobile-top-bar.tsx
git commit -m "feat: mobile top bar with glass-texture hamburger overlay, focus trap, ESC close"
```

---

## Task 5: Update AppShell — skip-nav, landmarks, MobileTopBar wiring

**Files:**
- Modify: `src/components/layout/app-shell.tsx` (full replacement)

`AppShell` stays a server component (reads `session` from `getSession()`). Changes:
- Outer flex becomes `flex-col md:flex-row` so `MobileTopBar` stacks above `<main>` at mobile, while `<Sidebar>` and `<main>` sit side-by-side at tablet/desktop.
- New skip-nav anchor: visually hidden by default (`sr-only`), reveals on focus with gold background, 2-px top/left offset, z-50.
- `<MobileTopBar user={user} />` added; it self-hides at `md+` via `md:hidden`.
- `<main>` gets `id="main"` and `tabIndex={-1}` so the skip-nav link can focus it.
- Horizontal padding on `<main>` drops from `px-6` to `px-4 md:px-6 lg:px-8` to match the smaller mobile viewport.

- [ ] **Step 1: Replace `src/components/layout/app-shell.tsx`**

```tsx
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
```

Note: `focus:outline-none` on `<main>` is intentional — we do not want a visible ring when the skip-nav lands focus there; the user's attention is already redirected by the scroll position and screen reader announcement.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/app-shell.tsx
git commit -m "feat: app shell — skip-nav, landmarks, mobile top bar integration"
```

---

## Task 6: EventTabs keyboard + ARIA

**Files:**
- Modify: `src/components/events/event-tabs.tsx` (full replacement)

Implements the WAI-ARIA automatic-activation pattern: arrow keys move focus *and* activate the new tab. Adds roles, roving `tabIndex`, and `Home`/`End` support.

- [ ] **Step 1: Replace `src/components/events/event-tabs.tsx`**

```tsx
"use client";

import { useRef, useState, type KeyboardEvent } from "react";

interface Tab {
  id: string;
  label: string;
}

export function EventTabs({
  tabs,
  children,
}: {
  tabs: Tab[];
  children: Record<string, React.ReactNode>;
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    setActiveTab(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Event sections"
        onKeyDown={handleKey}
        className="flex gap-0 border-b border-outline/15 mb-6"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 border-b-2 -mb-px cursor-pointer ${
                isActive
                  ? "border-gold text-gold"
                  : "border-transparent text-grey hover:text-charcoal"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {children[activeTab]}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/events/event-tabs.tsx
git commit -m "feat: EventTabs ARIA roles, roving tabIndex, arrow-key activation"
```

---

## Task 7: Regression check — build + existing test suite

No new unit tests were added (per design decision). Confirm existing tests still pass and the production build succeeds.

- [ ] **Step 1: Run Vitest**

Run: `npm run test -- --run`
Expected: all tests pass. If any pre-existing tests were flaky, note them but do not fix in this plan.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds with no new type errors or lint errors. Warnings from prior PRs are unchanged.

- [ ] **Step 3: If anything fails**

Stop and fix. Do not proceed to QA until `npm run build` and `npm run test -- --run` are both green.

No commit — this step verifies prior work.

---

## Task 8: Manual QA pass (option B verification)

This is the acceptance test for the whole plan. Each sub-item is a binary pass/fail check. Work through all three sections before claiming complete.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open `http://localhost:3000` and sign in (use the magic-link flow).

- [ ] **Step 2: Breakpoint pass — `375×667` (iPhone SE)**

Chrome DevTools → Toggle Device Toolbar → iPhone SE.

- [ ] 56px charcoal top bar visible, sidebar not rendered.
- [ ] Tapping hamburger opens overlay with glass texture (charcoal ~85% opacity, visible blur behind).
- [ ] Tapping the backdrop area closes the overlay; focus returns to the hamburger button (gold ring appears on it).
- [ ] Pressing `Esc` with overlay open closes it; focus returns to hamburger.
- [ ] Tapping a nav link navigates to that route and the overlay closes.
- [ ] While the overlay is open, the body behind does not scroll.

- [ ] **Step 3: Breakpoint pass — `768×1024` (iPad portrait)**

DevTools → iPad (or custom 768×1024).

- [ ] Top bar absent, sidebar is 64px wide, showing only icons.
- [ ] Hovering an icon reveals a charcoal tooltip with the label (e.g. "EVENTS") to the right.
- [ ] Tab-cycling to an icon link also reveals the tooltip (focus-visible path).
- [ ] Sign-out button at tablet shows an icon (no text) with a 44×44 target.

- [ ] **Step 4: Breakpoint pass — `1280×800` (laptop, regression)**

DevTools → Responsive, set 1280×800.

- [ ] Full 256px sidebar with brand block, nav labels, and "SIGN OUT" text — no regression from the previous behavior.
- [ ] Icons now visible next to labels (new addition) — confirm they inherit the gold/grey colors from the link state.

- [ ] **Step 5: Keyboard pass (no mouse)**

Reset to desktop width (1280). Reload the page. All actions below use only keyboard input (Tab, Shift-Tab, Enter, arrows).

- [ ] First `Tab` reveals "Skip to main content" link at top-left with gold background.
- [ ] Pressing `Enter` on skip-nav jumps the cursor to `<main>`. Next `Tab` enters the first focusable inside page content (not a sidebar link).
- [ ] Navigate to any event detail page. `Tab` into the tablist; visible gold ring on the active tab.
- [ ] `ArrowRight` moves focus to the next tab AND activates it (content swaps). Wraps at end.
- [ ] `ArrowLeft` wraps at start.
- [ ] `Home` jumps to first tab, `End` jumps to last.
- [ ] At mobile width (375): `Tab` to hamburger (focus ring visible), `Enter` opens overlay, `Tab` cycles only inside overlay (first-to-last to first again), `Shift-Tab` cycles backward, `Esc` closes.

- [ ] **Step 6: VoiceOver spot-check (macOS Safari)**

Enable VoiceOver (`Cmd-F5`). Reload any page.

- [ ] Rotor (VO+U) → Landmarks lists: "banner" (mobile only), "navigation, Main navigation", "main".
- [ ] On event detail: focusing a tab announces something like "Overview, selected, tab, 1 of 5".
- [ ] At tablet width: focusing an icon-only sidebar link announces "Events, link" (label read from `aria-label`, not "link, link, link").

- [ ] **Step 7: axe DevTools audit**

Install [axe DevTools browser extension](https://www.deque.com/axe/devtools/) if not already. Run the scan on:
- [ ] `/` at 375, 768, 1280
- [ ] `/events` at 375, 768, 1280
- [ ] `/events/[id]` (pick any event) at 375, 768, 1280
- [ ] `/recipes` at 375, 768, 1280

Acceptance: zero serious or critical violations. Moderate violations recorded in a QA notes comment (handle in a follow-up if found).

- [ ] **Step 8: If any QA step fails**

Stop and fix the root cause. Do not work around it. Re-run the affected breakpoint pass. Only move to Task 9 when every item above is ticked.

---

## Task 9: Update TODOS.md

Remove the completed items from `TODOS.md` and strike the one that was already shipped in a prior PR but never pruned.

- [ ] **Step 1: Edit `TODOS.md`**

Delete these three `###` blocks (and their body paragraphs) from `TODOS.md`:

1. **Send to LC brief preview slide-over** — already shipped in commit `926e317` (`feat: brief preview slide-over before Send to LC dispatch`). This was stale on the TODO list.
2. **Retrofit accessibility into Phase 1 components** — completed by this plan.
3. **Responsive sidebar and mobile top bar** — completed by this plan.

Leave the remaining items untouched:
- "Create GitHub repo (bar-xcellence/backstage)"
- "Resolve Resend domain verification for bar-excellence.app"
- "Get Murdo's cocktail recipes"
- "PDF memory limit protection"

- [ ] **Step 2: Commit**

```bash
git add TODOS.md
git commit -m "chore: remove completed items from TODOS — responsive sidebar, a11y retrofit, brief preview"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task(s) |
|---|---|
| Three breakpoints (mobile / tablet / desktop) | 3, 4, 5 |
| `AppShell` responsibility split (server component, landmarks, skip-nav) | 5 |
| `Sidebar` responsive + icons + `aria-label` + tooltip | 3 |
| `MobileTopBar` component + overlay + focus trap | 4 |
| `nav-icons.tsx` with 5 SVGs (incl. HamburgerIcon + SignOutIcon) | 1 |
| Landmarks (`banner`, `navigation`, `main`) + skip-nav | 5 |
| Global focus-visible rule | 2 |
| Mobile overlay close behavior (ESC, backdrop, nav click, route change, body scroll lock, focus return) | 4 |
| Tablet icon-only tooltip | 3 |
| `EventTabs` ARIA + roving tabIndex + arrow/Home/End keys | 6 |
| Manual QA protocol (breakpoints, keyboard, screen reader, axe) | 8 |
| Regression safety (existing tests + build pass) | 7 |
| TODOS.md cleanup | 9 |

All spec requirements have an implementing task.

**Type consistency check:** `NavItem` uses the same `{ label, href, Icon }` shape in Task 3 (`sidebar.tsx`) and Task 4 (`mobile-top-bar.tsx`). `SignOutIcon` and `HamburgerIcon` are introduced in Task 1 and referenced in Tasks 3 and 4. `SessionData` import path `@/lib/auth-config` is consistent with the existing `sidebar.tsx`. No naming drift across tasks.

**Placeholder scan:** No "TBD", "TODO", "similar to Task N", or silent "implement later" references. Every code-changing step shows the full code.
