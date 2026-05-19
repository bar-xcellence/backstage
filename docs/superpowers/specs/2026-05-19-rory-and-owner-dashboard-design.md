# Backstage Dashboard — Rory + Owner unified

**Document type**: Design spec (companion to `docs/Backstage_Rory_Dashboard_PRD.md`)
**Status**: Approved, ready for implementation plan
**Date**: 2026-05-19
**Author**: Rob (with Claude)

---

## 0. Hard invariant

**Partners (Rory at LC) must never see owner information.**

The four layers of defence, listed top-down:

1. `requireRole()` gates every server action.
2. `getDashboardEvents()` branches on `session.role` and returns a different shape per role — partners receive a strictly narrower projection, never the full row.
3. `stripPartnerFinancials()` (`src/lib/partner-event-sanitisation.ts`) zeroes the five forbidden fields (`invoiceAmount`, `costAmount`, `stockReturnPolicy`, `cardPaymentPrice`, `cardPaymentCommission`) on any partner-facing path that touches an event row.
4. A pinned unit test enforces the partner-visible allow-list — adding a new column to `events` will fail the test until a human consciously decides whether the column is partner-safe.

The single financial field a partner may see is `lcPayout`. No other money figure appears on a partner screen. No `notesCustom`, no `outcomeNotes`, no `lcSentAt`, no checklist counts, no margin, no invoice.

This invariant overrides every other design choice in this document.

---

## 1. Goals

- Replace the existing `/` KPI dashboard with a single role-aware route.
- Give Rory the self-service month-of-events view specified in `docs/Backstage_Rory_Dashboard_PRD.md`.
- Give Murdo and super_admins a denser version of the same view, with the operational and financial signals they already rely on.
- Eliminate the recurring "what are the June events and what's the budget" phone call from Rory to Murdo.
- Keep the Reserve Noir design language intact — no soft UI, no rounded corners, no border-line sectioning.

## 2. Non-goals

- RLS policies on the `events` table (flagged for a future security-hardening pass; current app-level defence is the established pattern).
- A new `provisional` enum value distinct from `enquiry`. Presentational mapping handles Rory's view.
- Migrating away from the 6-state `event_status` enum.
- Export to PDF/CSV from the dashboard, in-app messaging, notifications, historical analytics, drag-to-reorder, equipment template surfacing, recipe library exposure, or multi-LC operator support.

---

## 3. Architecture

Single route at `/` (existing authenticated landing). Server component delegates to a role-aware data loader and renders one of two client shells from a single tree.

```
src/app/(authenticated)/page.tsx
  server: reads session, calls getDashboardData() + getDashboardEvents(),
          renders <DashboardView>
src/components/dashboard/dashboard-view.tsx
  client: top-level shell, role-aware
    ├── <ViewAsBanner>        when ?viewAs=partner is honoured (owner-only)
    ├── <KpiStrip>            owner + super_admin only
    ├── <ActionsQueue>        owner + super_admin only
    ├── <MonthHeader>         eyebrow + month select + status chips
    ├── <SummaryStrip>        role-aware totals
    └── <EventCardList>
          └── <EventCard>     polymorphic: partner variant vs owner variant
```

### 3.1 Data loaders

`src/actions/dashboard.ts` keeps `getDashboardData()` (KPIs + actions queue) on its existing contract.

A new `getDashboardEvents({ month, statuses })` action is added:

```ts
export async function getDashboardEvents(params: {
  month: string;       // "YYYY-MM" | "upcoming"
  statuses: string[];  // role-validated server-side
}): Promise<DashboardEventListResult>

type DashboardEventListResult =
  | { viewerRole: "partner"; events: PartnerEventCard[]; summary: PartnerSummary }
  | { viewerRole: "owner"; events: OwnerEventCard[]; summary: OwnerSummary };
```

Discriminated union by `viewerRole`. The TypeScript type system enforces "partner branch can never reach an owner field" — code touching `event.invoiceAmount` only typechecks inside the owner branch.

### 3.2 No new routes

The existing `/events` page (table + kanban) stays untouched as the owner's "go deep" surface. The dashboard is the new primary view at `/`.

### 3.3 "View as Rory" preview

Owner-only query param `?viewAs=partner` on `/`. The page-level server component:

1. Reads `session.role`.
2. If `session.role === "owner" || "super_admin"` and the param equals `"partner"`, treats the effective role as `"partner"` for the entire render.
3. Renders `<ViewAsBanner>` (sticky top, gold-bordered, "Viewing as: Rory (LC) — [Exit preview]").
4. For any other session role, the param is ignored silently. A partner hitting `/?viewAs=partner` is already on the partner view.

The owner identity is never lost — server actions still see the real session. The preview is purely presentational.

---

## 4. Data model

### 4.1 New columns on `events`

```ts
// src/db/schema.ts additions
lcPayout: decimal("lc_payout", { precision: 10, scale: 2 }),
commissionNote: text("commission_note"),
elementsSummary: text("elements_summary"),
```

All three optional. No `NOT NULL` constraints — existing events keep rendering.

- `lcPayout`: what Bar Excellence pays LC for delivering this event. The only financial field a partner sees.
- `commissionNote`: free-text annotation for variable income (e.g. cocktail sales commission). Renders as a secondary line beneath the payout figure on Rory's card.
- `elementsSummary`: Murdo's "Elements" line. Free-text, editorial. Not derived from equipment templates — this is intentional and pre-empted in the mistakes log.

### 4.2 Migration

Drizzle migration via `drizzle-kit generate`. Backfill values for all three new fields are `NULL`. Seed (`src/db/seed.ts`) is updated to populate the four PRD reference events (Cinven, The Stoop, ICC, NEC) with `elementsSummary` + `lcPayout` + (where applicable) `commissionNote`.

### 4.3 Role-level access

App-level enforcement is the canonical pattern. RLS is deferred.

- `requireRole()` gates every server action.
- Partner-facing paths use a `partnerEventProjection()` helper that returns only the allow-listed fields:

```ts
// src/lib/partner-event-projection.ts

// Real `events` columns a partner may receive.
export const PARTNER_VISIBLE_DB_FIELDS = [
  "id",
  "eventDate",
  "eventType",
  "guestCount",
  "elementsSummary",
  "venueName",
  "venueHallRoom",
  "addressLine1",
  "addressLine2",
  "city",
  "postcode",
  "venueTenant",
  "cateringPartner",
  "status",                // server returns raw, client maps via toPartnerStatus()
  "lcPayout",
  "commissionNote",
] as const;

// Server-computed fields appended to the partner shape.
// Not columns on `events` — see §4.4.
export const PARTNER_VISIBLE_COMPUTED_FIELDS = ["serveCount"] as const;
```

A pinned test (`src/lib/partner-event-projection.test.ts`) enforces:

1. Every key in `PARTNER_VISIBLE_DB_FIELDS` exists on the `events` schema.
2. Every forbidden financial key from `stripPartnerFinancials()` is absent from both lists.
3. The set of `events` columns not in `PARTNER_VISIBLE_DB_FIELDS ∪ stripPartnerFinancials` keys is the explicit owner-only set — adding a new column to `events` fails the test until a human consciously assigns it to one of the three buckets (partner-visible, partner-stripped, owner-only).

### 4.4 `serveCount` — open question, resolved in build

The PRD references a `serve_count` integer column. The current schema does **not** have this as a column on `events` — serves are derived from cocktails × quantity in the cocktails join table. Two options the build will decide between:

- **Option A**: add `serveCount` as a denormalised column on `events`, populated by Murdo at event creation. Matches PRD literally. Simplest for the card render. Drift risk: column and join-table can disagree.
- **Option B**: compute serves on the server in `getDashboardEvents()` from the cocktails join, project as `serveCount` on the partner shape. No new column, no drift risk, slightly more SQL.

**Decision: Option B** — compute server-side. Avoids drift, no migration cost, the join is already loaded for the brief email path. If the SQL becomes hot we can memoise.

### 4.5 Event form

`event-form.tsx` adds three optional fields, grouped after `notesCustom`:

| Field | UI | Helper text |
|---|---|---|
| `lcPayout` | numeric input (GBP) | "What Bar Excellence pays LC for this event." |
| `commissionNote` | textarea | "Variable income annotation, e.g. cocktail sales commission." |
| `elementsSummary` | textarea | "Short summary of what we're delivering — appears on Rory's dashboard and briefs." |

`createEvent` and `updateEvent` actions persist all three.

---

## 5. Role-aware rendering

### 5.1 Status mapping

`src/lib/dashboard-status.ts` (new file):

```ts
type DbStatus = "enquiry" | "confirmed" | "preparation" | "ready" | "delivered" | "cancelled";
type DisplayStatus = "provisional" | "confirmed" | "delivered" | "cancelled";

export function toPartnerStatus(s: DbStatus): DisplayStatus {
  if (s === "enquiry") return "provisional";
  if (s === "delivered" || s === "cancelled") return s;
  return "confirmed";  // confirmed | preparation | ready collapse to one badge
}

export const PARTNER_VISIBLE_STATUSES: DbStatus[] = [
  "enquiry", "confirmed", "preparation", "ready", "delivered", "cancelled",
];
```

Owner sees the raw 6-state badge. Partner sees the collapsed 4-state badge.

### 5.2 Partner visibility expansion

Current `listEvents()` filters `enquiry` events out for partners. This must change — Rory needs to see provisional events (PRD §5.4). The new `getDashboardEvents()` does **not** apply that filter; the status-chip filter on the dashboard becomes the only gate.

Existing `listEvents()` (used by `/events`) is left alone — partners don't navigate there.

### 5.3 Owner view layout

```
HEADER         Backstage / Dashboard
KPI STRIP      Next event · This week · Overdue · Revenue this month
ACTIONS QUEUE  Cormorant heading "Needs attention" + ≤5 rows
─── 64px ───
MONTH HEADER   "JUNE 2026 · 4 EVENTS"           [Month ▼]  [chips...]
SUMMARY STRIP  "£8,400 confirmed · £1,400 provisional"
               "£12,400 invoiced this month · 1 brief unsent"
─── 48px ───
CARDS          chronological, oldest first, 32px gap
```

### 5.4 Partner view layout

```
HEADER         Backstage / Dashboard
MONTH HEADER   "JUNE 2026 · 4 EVENTS"           [Month ▼]  [chips...]
SUMMARY STRIP  "£8,400 confirmed · £1,400 provisional"
─── 48px ───
CARDS          chronological, oldest first, 32px gap
```

### 5.5 Default filter state

| Role | Default month | Default statuses |
|---|---|---|
| Owner | current month | enquiry, confirmed, preparation, ready, delivered (cancelled OFF) |
| Partner | current month | confirmed, provisional (delivered + cancelled OFF) |

Filters live in URL params (`?month=2026-06&statuses=confirmed,provisional`). Missing params fall back to role default.

### 5.6 Empty state

```
"No events in this window."
"Adjust the month or status filter to see more."
```

Both roles. Owner-only exception: if the database has zero events at all (not just zero matching filters), show "No events yet." with a gold CTA `[Create event →]`.

---

## 6. Card components

`src/components/dashboard/event-card.tsx` — single file, polymorphic by `viewerRole`.

### 6.1 Partner card

Follows PRD §5.3.

```
3 JUN                                  [CONFIRMED]
── Cormorant 300, 48px, gold ──        ── status ──

Cocktail reception for 50 guests
150 cocktail serves

ELEMENTS  ── eyebrow gold ──
2 cocktail bartenders, pop up bar, stock/glass for 150 serves

Cinven Office
21 St James's Square, London SW1Y 4JZ
── multi-line via formatAddressLines() ──

── 32px vertical gap ──

LC PAYOUT  ── eyebrow gold ──
£1,400  ── Cormorant 300, 36px, charcoal ──
+ Small commission on cocktails at £9.95 each
  ── only when commissionNote present ──
```

Rules:

- `elementsSummary` row hidden if null.
- `commissionNote` row hidden if null.
- `lcPayout` formatted `£X,XXX` (no decimals if whole pounds). If null, the whole LC PAYOUT block is hidden — Rory's card just renders the upper half.
- Card is **non-interactive** for partner. No hover state, no click, no link.

### 6.2 Status badges

| Display | Treatment |
|---|---|
| `PROVISIONAL` | Outlined gold, 60% opacity, tooltip "Client has not yet confirmed" |
| `CONFIRMED` | Solid charcoal background, cream text, 2px gold left border |
| `DELIVERED` | Outlined secondary, card opacity drops to ~70% |
| `CANCELLED` | Outlined error, date renders with `line-through`, card opacity ~50% |

All 0px radius. No exceptions.

### 6.3 Owner card

Same body as partner card, plus a footer panel.

```
…(partner card body)…

── 32px vertical gap ──

┌── footer panel: surface-container-low (#F4F3F1), 24px horizontal inset, no border ──┐
│                                                                                     │
│  INVOICE     COST      MARGIN     PAYOUT                                            │
│  £2,400      £900      £1,100     £1,400                                            │
│                                                                                     │
│  Brief: sent 12 May        Checklist: 8 / 12                       T-4 DAYS         │
│                                                                    ── eyebrow gold ─│
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

Rules:

- Margin = `invoiceAmount - costAmount`. If either is null, the cell shows `—`.
- LC `PAYOUT` in the footer mirrors what Rory sees, so owner has one place to scan.
- `Brief:` shows `sent {DD MMM}` if `lcSentAt` set, gold `Not sent` if null and status ≥ confirmed, `—` if status is enquiry.
- `Checklist:` shows `N / M` complete. Gold `Action needed` if event within 48 hours and incomplete > 0.
- `T-N DAYS`: gold if N ≤ 7. Charcoal otherwise. `TODAY` if 0. `PAST` if negative.
- Whole card is clickable, wrapped in `<Link href="/events/{id}">`. Hover lifts card border to gold @ 40%.

### 6.4 Mobile (≤768px)

- Card width = 100% of viewport minus 16px gutters.
- Footer figures wrap: `Invoice / Cost` on row 1, `Margin / Payout` on row 2.
- Date + status badge stay top-left / top-right.
- All tap targets ≥ 44px (PRD acceptance #12).

### 6.5 Card list parent

`<EventCardList>`:

- Single column, 32px gap, max-width `760px`, centered.
- Skeleton placeholders on initial server load (no flash).
- Empty state delegated to §5.6.

---

## 7. Filters, summary strip, state management

### 7.1 `<MonthSelect>`

Native `<select>` styled to Reserve Noir tokens. Options:

- Previous month
- Current month (default)
- Next month
- Two months out
- Three months out
- All upcoming (current month onward, no upper bound)

### 7.2 `<StatusChips>`

Multi-select chip group. At least one chip must remain selected — clicking the last selected chip re-enables it with a subtle shake (no error message, just resistance).

| Role | Chips |
|---|---|
| Partner | Confirmed · Provisional · Delivered · Cancelled |
| Owner | Enquiry · Confirmed · Preparation · Ready · Delivered · Cancelled |

Selected chip: solid charcoal bg, cream text, 2px gold left border.
Deselected: outlined gold @ 30%, gold text.
Hover: border rises to 60%.

### 7.3 URL as state source of truth

```
/?month=2026-06&statuses=confirmed,provisional&viewAs=partner
```

- `month`: `YYYY-MM` or `upcoming`. Missing → current month.
- `statuses`: comma-separated, server-validated against the role's allowed set. Invalid statuses dropped silently.
- `viewAs`: only `partner` honoured, owner-only. Missing → render as session role.

Filter changes use `router.push()` with `scroll: false`. Server re-renders. No client-side filtering — Backstage has on the order of 50 events at most, network cost is negligible.

### 7.4 Summary strip

```
PARTNER:
  "JUNE 2026 · 4 EVENTS"
  "£8,400 confirmed · £1,400 provisional"
   ↳ provisional line hidden if sum is £0

OWNER:
  "JUNE 2026 · 4 EVENTS"
  "£8,400 confirmed · £1,400 provisional"
  "£12,400 invoiced this month · 1 brief unsent"
   ↳ second line: sum of invoiceAmount for delivered events in window,
     plus count of confirmed+ events with lcSentAt null
   ↳ second line hidden if both figures are zero
```

All sums respect the current filter set. Confirmed and provisional figures are kept separate per PRD §5.6 — never combined into one headline number.

### 7.5 KPI strip and actions queue

`<KpiStrip>` and `<ActionsQueue>` (owner only) stay backed by the existing `getDashboardData()`. They always show "right now" state — they do not respond to month or status filters. This is deliberate: KPIs answer "what do I act on today", not "what does June look like".

---

## 8. Testing

### 8.1 Unit (Vitest)

- `dashboard-status.test.ts` — `toPartnerStatus()` covers all 6 db states and the visibility allow-list. Future enum changes force a conscious update here.
- `dashboard-summary.test.ts` — summary roll-up: confirmed/provisional split, filter-respecting sums, brief-unsent count, "all zero hides line" edge case.
- `partner-event-projection.test.ts` — pinned allow-list test:
  - Every key in `PARTNER_VISIBLE_DB_FIELDS` exists on the `events` schema.
  - Every forbidden financial key from `stripPartnerFinancials()` is absent from both partner lists.
  - Every column on `events` is classified into exactly one of: `PARTNER_VISIBLE_DB_FIELDS`, the `stripPartnerFinancials` forbidden set, or an explicit `OWNER_ONLY_FIELDS` list. A new column forces a conscious classification.

### 8.2 Integration

- `getDashboardEvents` returns the role-shaped payload for partner vs owner.
- Partner request with `statuses=enquiry,confirmed` returns enquiry events (previous `listEvents` would not).
- The `viewAs=partner` param is purely page-level; the server action only branches on `session.role`.

### 8.3 E2E (Playwright, against `next start -p 3100` with `ENABLE_TEST_AUTH=true`)

- `dashboard-partner.spec.ts` — partner test user lands on `/`, sees only partner-visible fields, sees no financial figures beyond `lcPayout` in DOM, clicking a card does not navigate.
- `dashboard-owner.spec.ts` — owner sees KPI strip, actions queue, summary strip second line, owner card footer with four financial figures, clicking a card navigates to `/events/{id}`.
- `dashboard-view-as-rory.spec.ts` — owner with `?viewAs=partner` sees the banner and the partner card variant; partner with the same param sees no banner (param ignored).
- `dashboard-filters.spec.ts` — month change updates URL + cards + summary strip in place; status chip toggle persists across reload; last-chip-deselect resists.

### 8.4 Out of scope for test

Visual regression / screenshot diffing. Reserve Noir tokens are exercised by existing pages; not worth setting up Chromatic for one route.

---

## 9. Build sequence

Each phase ends with a verifiable artefact. Don't start phase N+1 until N is verified.

1. **Schema + migration** (half day) — add 3 fields, Drizzle migration, seed updates so the four PRD reference events (Cinven, The Stoop, ICC, NEC) have populated values.
2. **Status mapping + projection helpers** (half day) — `dashboard-status.ts`, `partner-event-projection.ts`, unit tests. Pure functions, no UI.
3. **Server actions** (half day) — `getDashboardEvents()`, summary roll-up, partner visibility expansion. Integration tests against a seeded Neon branch.
4. **Card components** (one day) — partner variant first (matches PRD reference cards exactly), owner variant on top. Visual review against the four June 2026 reference events.
5. **Filter + summary components** (half day) — `<MonthSelect>`, `<StatusChips>`, `<SummaryStrip>`, URL-state plumbing.
6. **Page assembly** (half day) — `/` route, role-aware shell, existing KPI strip + actions queue preserved unless touched by other work.
7. **View-as-Rory** (half day) — banner, query param guard, owner-only respect.
8. **Event form additions** (half day) — three new fields in `event-form.tsx`, create + update actions persist them. Done last so Murdo can edit values against a working dashboard.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Partner sees owner data | Four-layer defence (§0). Pinned allow-list test fails when new columns appear. Playwright partner spec asserts no financial figures in DOM beyond `lcPayout`. |
| `lcPayout` figures don't reconcile with what Murdo actually pays LC | Out of scope. PRD §9 already flags the 50/50 vs 55/45 split. Surfaced as TODO. |
| Card layout breaks at 375px | Mobile spec in §6.4. Playwright runs against a 375px viewport. |
| KPI strip + cards on same page becomes overwhelming | Reserve Noir whitespace (48–64px gaps) carries the layout. If user testing shows density issues, fold KPIs into the summary strip in a follow-up. Don't pre-optimise. |
| Murdo forgets which view he's in during "View as Rory" | Sticky banner, full-width, gold border. Cannot be dismissed without exiting the preview. |
| `elementsSummary` tempts a future dev to auto-generate from equipment templates | This is an editorial field. Pre-empted in CLAUDE.md mistakes log on landing. |
| Drift between `events.serveCount` and cocktails join table | Resolved by computing serves server-side from the join (§4.4 Option B). No new column. |

---

## 11. Acceptance criteria

The build is complete when:

1. Logged in as `partner`, the user lands on `/` and sees the partner dashboard layout from §5.4.
2. Each partner card displays only the eight content blocks from §6.1 and no others.
3. Status badges render with the visual treatments in §6.2.
4. Logged in as `owner` or `super_admin`, the user lands on `/` and sees the owner dashboard layout from §5.3 with KPI strip and actions queue.
5. Owner cards include the footer panel from §6.3 with all four financial figures, brief sent status, checklist progress, and T-N days countdown.
6. Month select and status chips both update card list + summary strip in place. URL params persist filter state across reload.
7. The summary strip shows confirmed and provisional totals as separate figures, never summed.
8. Provisional events render with reduced visual weight (60% opacity badge) relative to confirmed.
9. Commission notes render as a secondary line under the payout figure, only when present.
10. Logged in as `partner`, attempting to navigate to `/events/{id}/edit` returns 403 or redirects (existing behaviour, not regressed).
11. Logged in as `partner`, the rendered DOM contains none of the owner-only labels (`INVOICE`, `COST`, `MARGIN`, `Brief:`, `Checklist:`, `T-` countdown) anywhere on `/`. The only money figure in the card region is `LC PAYOUT`. Verified by Playwright text assertions against the seeded reference events.
12. Logged in as `owner`, hitting `/?viewAs=partner` shows the sticky banner from §3.3 and the partner card variant. Exiting via the banner link returns to `/`.
13. Logged in as `partner`, hitting `/?viewAs=partner` shows no banner — the param is silently ignored.
14. The empty state renders when filters produce no results.
15. The page is usable on a mobile viewport down to 375px. Cards stack, footer figures wrap as specified.
16. The pinned partner allow-list test fails when a new column is added to `events` without classifying it as `PARTNER_VISIBLE_DB_FIELDS`, `stripPartnerFinancials` forbidden, or `OWNER_ONLY_FIELDS`.

---

## 12. Decisions captured here for the record

- **Single canonical `/` route** for both roles, role-aware rendering. Existing KPI dashboard is replaced.
- **Existing 6-state `event_status` enum is kept.** Partner sees a 4-state presentational mapping via `toPartnerStatus()`.
- **Partner visibility expands** to include `enquiry` events (mapped to PROVISIONAL for display). Necessary for the PRD's provisional-events-as-first-class behaviour.
- **RLS is out of scope.** App-level defence is the established pattern; adding RLS for one table without doing it everywhere creates inconsistent posture.
- **`serveCount` is computed server-side**, not denormalised as a column. Avoids drift with the cocktails join.
- **`elementsSummary` is editorial**, written by Murdo. Not derived from equipment templates.
- **KPI strip and actions queue are unfiltered.** They show "right now" state, independent of month/status filters.

---

## 13. Sources

- `docs/Backstage_Rory_Dashboard_PRD.md`
- `stitch_backstage_events_dashboard/reserve_noir/DESIGN.md`
- `src/db/schema.ts`
- `src/actions/dashboard.ts`, `src/actions/events.ts`
- `src/lib/partner-event-sanitisation.ts`
- `CLAUDE.md` Role Security rules
- Brainstorming session, 2026-05-19
