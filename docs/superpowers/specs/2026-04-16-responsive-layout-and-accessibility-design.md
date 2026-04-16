# Responsive Layout + Accessibility Retrofit — Design

**Date:** 2026-04-16
**Scope:** Phase 3b Tasks 8-9 (responsive sidebar, tablet + mobile) bundled with the Phase 1 accessibility TODO (ARIA landmarks, skip-nav, focus management, EventTabs keyboard).
**Out of scope:** Quick Capture FAB (Phase 3b Task 10 — deferred), PDF memory-limit protection (Phase 1 TODO — separate PR).

## Goal

Backstage currently renders a fixed 256px sidebar at every viewport and has no accessibility scaffolding (no landmarks, no skip-nav, no keyboard handling on EventTabs, no focus-visible styling). On a phone the sidebar eats half the screen; a keyboard user has no way to reach main content without tabbing through every nav link first.

This design adds three responsive layout modes, full ARIA landmarks, a skip-nav link, keyboard focus management for `EventTabs`, and a global focus-visible ring — without pulling in new dependencies and without disturbing the server-component `AppShell` boundary.

## Architecture

Three layout modes keyed off Tailwind's default breakpoints. No custom breakpoints introduced.

| Viewport | Tailwind prefix | Layout |
|---|---|---|
| `< 768px` | (default) | `MobileTopBar` (56px, charcoal) visible. Sidebar hidden by default; renders as a glass-texture overlay when hamburger-toggled. |
| `768–1023px` | `md:` | Icon-only sidebar (64px wide). Nav labels and brand text hidden. Tooltip on hover/focus. |
| `≥ 1024px` | `lg:` | Current 256px sidebar with full labels. Untouched. |

Glass overlay style uses the Reserve Noir "Glass & Texture" token: `#1E1F2E` at 85% opacity + `backdrop-blur-[20px]`, sliding from left.

### Component responsibility split

- **`AppShell`** (server component, stays server) — reads session, renders skip-nav anchor, `<Sidebar>` (desktop/tablet), `<MobileTopBar>` (mobile-only via `md:hidden`), and `<main id="main" tabIndex={-1}>`. No state, no client JS added here.
- **`Sidebar`** (existing client component) — gains responsive classes (`w-64 md:w-16 lg:w-64`), nav labels hidden via `md:hidden lg:inline`, new inline SVG icons always visible. Stays a single component for desktop + tablet; CSS does the work.
- **`MobileTopBar`** (new client component) — owns hamburger toggle state, renders the glass overlay, handles ESC + backdrop + nav-link close, and focus-trap while open. Uses `usePathname` to auto-close on route change.
- **`EventTabs`** (existing client component) — gains `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls`, roving `tabIndex`, and arrow-key handler (WAI-ARIA automatic activation: ArrowLeft/Right/Home/End move focus and activate in one stroke).
- **`nav-icons.tsx`** (new) — four inline SVG constants: `DashboardIcon`, `EventsIcon`, `RecipesIcon`, `HamburgerIcon`. 20×20, stroke-width 1.5, `currentColor` so they inherit link states.

Keeping `Sidebar` as a single component (not splitting into desktop/tablet variants) avoids prop-drilling and matches the project's existing single-responsibility components.

## Accessibility details

### Landmarks

In `AppShell`:
- Skip-nav anchor `<a href="#main">Skip to main content</a>` — `sr-only` by default, reveals via `focus:not-sr-only` with fixed positioning, gold background, z-50.
- `<aside aria-label="Main navigation">` on the existing `Sidebar` — only change is the label.
- `<header role="banner">` on `MobileTopBar`.
- `<main id="main" tabIndex={-1}>` — `tabIndex={-1}` lets the skip-nav target receive focus without being in the natural tab order.

### Focus-visible

Single global rule in `globals.css`:
```css
*:focus-visible {
  outline: 2px solid #A4731E;
  outline-offset: 2px;
}
```
This closes the focus-ring requirement for every interactive element in the app, not just the components changed here.

### Mobile overlay behavior

When `MobileTopBar` opens the overlay:
- Focus moves to the first nav link.
- `body { overflow: hidden }` applied via `useEffect` while open, restored on close.
- ESC keydown → close, return focus to hamburger button.
- Backdrop click (area behind the glass panel) → close, return focus to hamburger.
- Nav `<Link>` click → navigate + close (via `onClick` handler on each link).
- Route change (`usePathname` effect) → close (belt-and-braces in case a link navigates without calling `onClick`, e.g., programmatic redirects).
- Focus trap: hand-rolled (no deps). On Tab/Shift-Tab, query focusable elements inside the overlay and wrap index at the ends. ~25 lines.

### Tablet icon-only tooltip

Each icon-link at the `md:` breakpoint:
- `aria-label={item.label}` (so screen readers get the full label, since the visible text span is hidden).
- CSS-only visible tooltip: absolute-positioned label span with `opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100`, positioned to the right of the icon.

Sighted keyboard users see the tooltip on Tab; screen-reader users hear the label; pointer users see it on hover.

### EventTabs keyboard (WAI-ARIA automatic activation)

- Container: `role="tablist"` + `aria-label="Event sections"`.
- Each button: `role="tab"` + `aria-selected={active}` + `aria-controls={panelId}` + `id={tabId}` + `tabIndex={active ? 0 : -1}` (roving).
- Panel wrapper: `role="tabpanel"` + `aria-labelledby={tabId}` + `tabIndex={0}`.
- Key handler on the tablist:
  - `ArrowRight` → next tab, wraps at end.
  - `ArrowLeft` → previous tab, wraps at start.
  - `Home` → first tab.
  - `End` → last tab.
  - All of the above activate the tab as well as move focus (automatic pattern — content is cheap to render).

## Testing approach

No unit tests for this slice. Rationale: current Vitest setup is `environment: "node"`, no `@testing-library/react`, no jsdom/happy-dom. Responsive/visual/keyboard behavior is hard to TDD meaningfully without a real rendering environment, and standing up RTL for one feature is infrastructure sprawl for a 3-user app. If a future bug needs a regression test, Playwright (which has a stub script already) becomes the right investment.

In place of unit tests: the manual QA protocol below. This goes into the plan as a verification task and into the spec so future-me can re-run after any layout change.

### Manual QA protocol

**Breakpoint pass** (Chrome DevTools device mode):

- `375×667` (iPhone SE):
  - Top bar visible, sidebar hidden.
  - Hamburger opens overlay with glass texture.
  - Backdrop click closes. ESC closes. Nav link navigates + closes.
  - Focus returns to hamburger on close.
  - Body does not scroll while overlay is open.
- `768×1024` (iPad portrait):
  - Sidebar is 64px, icon-only.
  - Labels hidden; hovering an icon reveals a tooltip.
  - Tabbing to an icon reveals the tooltip (focus-visible).
- `1280×800` (laptop):
  - Full 256px sidebar with labels. No regression from current behavior.

**Keyboard pass** (no mouse, Safari + Chrome):

- Load any page. First Tab reveals "Skip to main content" link.
- Enter on skip-nav → focus jumps to `<main>`. Next Tab enters first focusable in content.
- On an event detail page: Tab into EventTabs. Arrow keys cycle tabs. Home/End jump. Content swaps.
- At mobile width: Tab to hamburger, Enter opens overlay, Tab cycles inside overlay only, ESC returns focus to hamburger.

**Screen reader spot-check** (VoiceOver on macOS):

- Landmarks announce: "banner", "navigation, Main navigation", "main".
- EventTabs announced as "tab, selected, 1 of N" style.
- Icon-only tablet links announced with full label (not "link, link, link").

**Axe audit** (axe DevTools browser extension):

- Run on `/`, `/events`, `/events/[id]`, `/recipes` at each of the three widths.
- Acceptance: zero serious/critical violations. Moderate violations reviewed case-by-case.

## Out of scope

- Quick Capture FAB (Phase 3b Task 10) — deferred.
- PDF memory-limit protection (Phase 1 TODO) — separate PR. Different surface area (`@react-pdf/renderer`), no file overlap.
- Events kanban drag-and-drop responsive behavior — kanban stays as-is on mobile; tablet/desktop already functional.
- New icon library dependency — hand-rolled inline SVGs instead.
- Playwright or RTL test infrastructure — deferred until a regression warrants it.

## Files touched

- Modify: `src/components/layout/app-shell.tsx` — add skip-nav, landmarks, `<MobileTopBar>`, `<main id>`.
- Modify: `src/components/layout/sidebar.tsx` — responsive classes, icons, `aria-label`, tablet tooltip CSS.
- Modify: `src/components/events/event-tabs.tsx` — ARIA roles, roving tabIndex, arrow-key handler.
- Modify: `src/app/globals.css` — `*:focus-visible` rule.
- Create: `src/components/layout/mobile-top-bar.tsx` — new client component.
- Create: `src/components/layout/nav-icons.tsx` — inline SVG constants.
