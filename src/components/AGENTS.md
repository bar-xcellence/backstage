# src/components — React UI (Reserve Noir)

## Purpose
All client-facing React components, grouped by surface: `dashboard/`, `events/`, `layout/`, `settings/`.
These render data already projected/sanitised by `../lib/` and `../actions/` — components are a
**presentation + defence-in-depth** layer, never the primary security boundary. Visual rules come
from the Reserve Noir design system.

## Entry Points
- `layout/app-shell.tsx` — role-aware shell; **spreads the iron-session instance to a plain object** before passing as a prop
- `dashboard/dashboard-view.tsx` / `dashboard-client.tsx` — owner KPI + actions queue; `event-card.tsx` (owner footer panel) vs partner non-interactive cards
- `events/event-form.tsx` — the single create/edit form (captures all Spec D/E/G/H/J/K fields)
- `events/brief-preview.tsx` — slide-over brief + `recipients-panel.tsx` at-send picker → `send-to-lc-button.tsx`
- `settings/from-address-section.tsx`, `settings/lc-recipients-section.tsx` — owner/super_admin only

## Contracts & Invariants
- **`"use client"` at the top of every component here.** Server actions stay in `../actions/`.
- **Components never re-expose owner-only fields to partners.** The payload is already stripped in
  `../lib/`; here you additionally gate owner-only UI on `!isPartner` (Times, Batching, Pop-up Bar,
  Install Instructions, Notes, serves/stations/lcSentAt/showName summary pills). This is
  defence-in-depth on top of the server strip — keep both.
- **Partner cards are non-interactive** and show only partner-visible fields + `lcPayout`,
  `commissionNote`, `elementsSummary`. Partner sees the collapsed `toPartnerStatus()` label only.
- **Session must be a plain object before crossing into a Client Component** (spread it) — an
  iron-session class instance is not serialisable (see Mistakes Log).
- `brief-preview.tsx` is one of the **four brief surfaces** that must stay in sync — see `../lib/AGENTS.md`.

## Patterns (Reserve Noir — non-negotiable)
- **0px border-radius globally** (enforced in `globals.css`) — never add `rounded-*`.
- Headings `font-[family-name:var(--font-cormorant)]`, body `font-[family-name:var(--font-raleway)]`.
- Utility labels: `text-[11px] font-medium tracking-[0.16em] uppercase`.
- Colours via tokens only: `text-gold`, `bg-charcoal`, `text-cream`, … (defined in `globals.css`).
- Minimum **44px** height on every interactive element (touch target).
- Empty states: warm Cormorant heading + Raleway body + gold CTA where an action exists, or hide
  the section entirely. **Never render "No items found."**

## Anti-patterns
- Don't fetch/mutate directly in a component — call a server action from `../actions/`.
- Don't put raw DB status strings or owner-only fields in a partner-reachable branch.
- Don't add bespoke colours, radii, or font stacks — extend the design tokens instead.

## Related Context
- Business logic & isolation: `../lib/AGENTS.md`
- Server actions: `../actions/` (`requireRole()` first, `revalidatePath()` after mutations)
- Design system: `../../stitch_backstage_events_dashboard/reserve_noir/DESIGN.md`
