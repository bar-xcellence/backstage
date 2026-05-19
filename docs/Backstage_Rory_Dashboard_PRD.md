# Backstage PRD Addendum — Rory Dashboard

**Document type**: PRD addendum
**Parent document**: Backstage PRD v2.1
**Project**: Backstage (events preparation and dispatch system)
**Subdomain**: `backstage.bar-excellence.app`
**Status**: Specification, ready for build
**Date**: May 2026
**Author**: Rob

---

## 1. Context

The current Backstage build delivers event briefs and PDF attachments to Rory at Liquor Collective via the "Send to LC" action. It does not give Rory a self-service view of upcoming events or their financial allocation.

Today, Rory accesses event information by either:

- Reading individual briefs in his inbox after they have been sent
- Phoning Murdo to ask "what are the June events and what's the budget?"

The second pattern is a recurring operational tax on Murdo. He has to open Google Drive, summarise manually, and reply. This addendum specifies the dashboard that eliminates that workflow.

The dashboard format is derived from the exact structure Murdo currently sends Rory by message. That format is treated as the canonical schema, not a new design.

---

## 2. Reference: Murdo's current manual format

Each event Murdo currently shares with Rory follows this structure:

```
Date: 3rd June
What: Cocktail reception for 50 guests, we serving 150 cocktails
Elements: 2 cocktail bartenders, pop up bar, stock/glass for 150 serves
Where: Cinven Office, 21 St James's Square, London SW1Y 4JZ
Budget: £1400
```

Provisional bookings carry a parenthetical note on the Date line. Variable income (e.g. cocktail sales commission) is appended to the Budget line as a free-text annotation.

This format is the dashboard's source of truth for field structure.

---

## 3. User and access scope

| User | Role | Access |
|---|---|---|
| **Rory** (Liquor Collective) | `lc_operator` | Read-only access to the dashboard, scoped to events the LC partnership is delivering. Sees only the fields listed in §5. Cannot see client name, client charge, Bar Excellence margin, or any other Command Centre data |
| **Murdo** | `owner` | Full read/write across all events. Can preview Rory's view via a "View as Rory" admin toggle for QA |

**Architectural constraint (from Backstage PRD v2.1, §Architecture Decision)**: LC users must not see revenue data, invoicing, margins, or client relationship data. The `lc_payout` field defined below is the only financial figure Rory's role is permitted to see, because it represents what LC is being paid, not what the client is being charged.

---

## 4. Data model changes

### 4.1 New fields on `events` table

```typescript
// Drizzle schema additions
status: pgEnum('event_status', [
  'provisional',   // Client expressed interest, not yet confirmed
  'confirmed',     // Client has signed off, event is going ahead
  'delivered',     // Event has taken place
  'cancelled'      // Event will not take place
])

lc_payout: numeric('lc_payout', { precision: 10, scale: 2 })
// The figure Bar Excellence pays Liquor Collective to deliver this event.
// Required for events in 'confirmed', 'delivered', or 'provisional' states.

commission_note: text('commission_note')
// Free-text annotation for variable income components.
// Example: "Small commission on cocktails sold at £9.95 each after 200 serves"
// Optional. Renders as a secondary line under the lc_payout figure.

guest_count: integer('guest_count')
// e.g. 50, 400. Already on the model per PRD v2.1 §Data Model.
// Reconfirmed here as required for dashboard display.

serve_count: integer('serve_count')
// e.g. 150, 1000. Already on the model. Reconfirmed.

elements_summary: text('elements_summary')
// Free-text. Maps directly to Murdo's "Elements" field.
// Example: "2 cocktail bartenders, pop up bar, stock/glass for 150 serves"
// Distinct from the full equipment template which lives in a related table.
```

### 4.2 Migration considerations

- All existing events without `status` should default to `confirmed` if a delivery date has passed, otherwise `provisional`. Confirm with Murdo before running the migration.
- All existing events without `lc_payout` need to be backfilled. Murdo to provide figures from his manual records, or set to `0` and flag for review.
- No deletion of existing fields.

### 4.3 Row-Level Security

The `lc_operator` role policy on the `events` table must:

- Allow `SELECT` only on these columns: `id`, `event_date`, `event_type`, `guest_count`, `serve_count`, `elements_summary`, `venue_name`, `venue_address`, `status`, `lc_payout`, `commission_note`
- Deny `SELECT` on: `client_name`, `client_charge`, `client_contact`, `internal_notes`, anything margin-related
- Deny all `INSERT`, `UPDATE`, `DELETE`

Application-level auth via WorkOS handles the role assignment. RLS is the defence-in-depth layer.

---

## 5. UI specification

### 5.1 Route

`backstage.bar-excellence.app/dashboard`

When an `lc_operator` logs in, this is the default landing route. Murdo's existing event list view remains the default for the `owner` role.

### 5.2 Page structure

```
┌─────────────────────────────────────────────────┐
│ Header: brand, month selector, status filter    │
├─────────────────────────────────────────────────┤
│ Summary strip:                                  │
│   "June 2026 — N events"                       │
│   "£X confirmed   £Y provisional"               │
│   "£X+Y combined potential"                     │
├─────────────────────────────────────────────────┤
│ Event card (chronological order, oldest first)  │
│ Event card                                      │
│ Event card                                      │
│ ...                                             │
├─────────────────────────────────────────────────┤
│ Empty state, if no events in selected window    │
└─────────────────────────────────────────────────┘
```

### 5.3 Event card

```
┌─────────────────────────────────────────────────┐
│ [Date, large, gold]      [Status badge]         │
│ 3 JUN                    CONFIRMED              │
│                                                 │
│ Cocktail reception for 50 guests                │
│ 150 cocktail serves                             │
│                                                 │
│ Elements                                        │
│ 2 cocktail bartenders, pop up bar,              │
│ stock/glass for 150 serves                      │
│                                                 │
│ Cinven Office                                   │
│ 21 St James's Square, London SW1Y 4JZ           │
│                                                 │
│ ──────────────────────────                      │
│ LC PAYOUT                                       │
│ £1,400                                          │
│ [if commission_note present:]                   │
│ + Small commission on cocktails at £9.95 each   │
└─────────────────────────────────────────────────┘
```

### 5.4 Status badges

| Status | Label | Visual treatment |
|---|---|---|
| `provisional` | PROVISIONAL | Outlined badge, muted opacity (60%), tooltip on hover: "Client has not yet confirmed" |
| `confirmed` | CONFIRMED | Solid charcoal background, cream text, gold accent left border |
| `delivered` | DELIVERED | Subdued, full opacity card with reduced visual prominence in the list |
| `cancelled` | CANCELLED | Strikethrough on date, card greyed out |

Provisional events visually softer than confirmed ones so Rory's eye is drawn to firm work first.

### 5.5 Filters

Top of page:

- **Month selector**: Dropdown defaulting to current month. Options: previous month, current month, next three months, "All upcoming"
- **Status filter**: Multi-select chip group. Default: Confirmed + Provisional selected. Delivered and Cancelled deselected by default

Filters update the card list and the summary strip in place.

### 5.6 Summary strip logic

```
"{Month} {Year} — {N} events"
"£{sum of confirmed lc_payout} confirmed"
"£{sum of provisional lc_payout} provisional"  // only shown if > 0
```

Confirmed and provisional totals shown as separate figures, not summed into a single number. This prevents Rory from planning resources against soft bookings.

### 5.7 Empty state

If no events match the filters:

> "No events in this window."
> "Adjust the month or status filter to see more."

### 5.8 Visual design tokens

Use the existing Backstage design system (mirrors the main Bar Excellence brand):

| Token | Value |
|---|---|
| Background | `#1E1F2E` (charcoal) |
| Text primary | `#FAF9F6` (cream) |
| Text secondary | `rgba(250, 249, 246, 0.7)` |
| Accent | `#A4731E` (gold) |
| Card border | `rgba(250, 249, 246, 0.1)` |
| Card hover border | `rgba(164, 115, 30, 0.4)` |
| Display font | Cormorant Garamond, 300 |
| Body font | Raleway, 400/500 |
| Label letter-spacing | `0.18em` (uppercase) |
| Border radius | `0` (sharp edges, no exceptions) |

---

## 6. Acceptance criteria

The build is complete when:

1. Logged in as `lc_operator`, the user lands on `/dashboard` and sees a list of events scoped to LC delivery.
2. Each event card displays exactly the eight fields from §5.3 and no others.
3. Status badges render with the visual treatments in §5.4.
4. Month selector and status filter both update the card list and summary totals in place, without a full page reload.
5. The summary strip shows confirmed and provisional totals as separate figures.
6. Provisional events are visually softer than confirmed ones (lower opacity or muted treatment).
7. Commission notes render as a secondary line under the budget figure, only when present.
8. Logged in as `lc_operator`, attempting to access `/events/{id}/edit` returns a 403 or redirects to `/dashboard`.
9. Logged in as `owner`, Murdo can toggle a "View as Rory" preview mode that renders the same dashboard with his admin chrome removed.
10. RLS policies on the `events` table prevent any `SELECT` of restricted columns when the session role is `lc_operator`. This must be verified via a direct database query in tests.
11. The empty state renders when filters produce no results.
12. The page is usable on a mobile viewport down to 375px. Cards stack vertically. The filter row remains accessible at the top.

---

## 7. Out of scope

Explicitly not included in this addendum. These can be considered for a future iteration once Rory has used the dashboard for a month:

- Export to PDF or CSV from the dashboard view
- In-app messaging or commenting on events
- Rory editing event details
- Notifications or email digests
- Historical analytics (e.g. monthly LC payout trend)
- Equipment template integration on the dashboard cards
- Recipe library exposure to LC
- Multi-user LC access (other LC staff beyond Rory)

---

## 8. Build sequence

Each phase ends with a verifiable artefact. Do not start the next phase until the previous one is verified.

### Phase 1 — Data model and migrations (half day)

- Add the `status`, `lc_payout`, `commission_note`, `guest_count` (confirm exists), `serve_count` (confirm exists), `elements_summary` fields to the `events` table via Drizzle migration
- Backfill existing rows with sensible defaults
- Verify migration on a local Neon branch before applying to production

**Done when**: Schema diff merged, migration applied to local DB, existing events still render correctly in Murdo's owner view.

### Phase 2 — RLS policy (half day)

- Write RLS policy for `lc_operator` role per §4.3
- Add a `lc_operator` test user in WorkOS or local dev auth
- Verify that the test user can `SELECT` only the permitted columns and nothing else

**Done when**: Manual SQL query as the test user returns only the eight permitted columns. Attempting to query restricted columns returns no rows or an explicit error.

### Phase 3 — Dashboard page scaffold (half day)

- Create `/dashboard` route under the Backstage app
- Implement auth-aware redirect: `lc_operator` lands here, `owner` lands on the existing event list
- Render the page shell with header, summary strip, and a placeholder card list using static data

**Done when**: Page renders with placeholder content. Auth-aware routing works for both roles.

### Phase 4 — Event cards and live data (one day)

- Fetch events from the database with the `lc_operator` permissions applied
- Render the card layout per §5.3
- Render the status badges per §5.4
- Render the commission note conditionally
- Verify on Murdo's June 2026 data that the four reference cards (Cinven, The Stoop, ICC, NEC) render correctly

**Done when**: All four reference events appear, in chronological order, with correct status badges, correct payouts, correct elements summary, and the Stoop commission note rendered as a secondary line.

### Phase 5 — Filters (half day)

- Implement month selector
- Implement status filter chip group
- Wire both to update the card list and summary strip without page reload (server actions or client state, builder's choice)

**Done when**: Filtering by month and status produces the expected subset of cards and the summary totals update.

### Phase 6 — Owner "View as Rory" mode (half day)

- Add an admin toggle in Murdo's owner chrome
- When enabled, renders the dashboard as Rory would see it, without owner chrome
- Toggle clearly indicated (e.g. banner "Viewing as: Rory (LC)") so Murdo can't be confused about which view he's in

**Done when**: Murdo can toggle the view, the banner is visible, and the rendered page matches what Rory would see when logged in directly.

### Phase 7 — Internal QA (one hour)

- Smoke test the full flow logged in as the test `lc_operator` user
- Verify acceptance criteria 1 to 12 manually
- Confirm mobile rendering at 375px viewport

**Done when**: All 12 acceptance criteria pass. Screenshot evidence captured.

### Phase 8 — Real test with Rory (one hour, separate session)

- Walk Rory through the dashboard on a video call
- Capture his immediate reactions, friction points, and any missing fields
- Issue list captured for follow-up

**Done when**: Rory has logged in himself, navigated to the dashboard, and confirmed it answers his "what are the June events and the budget" question without phoning Murdo.

---

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| RLS policy is misconfigured and leaks restricted data | Test as `lc_operator` before any LC user gets credentials. Direct SQL query verification, not just UI inspection |
| Provisional events get summed into headline figures, misleading Rory's resource planning | Display confirmed and provisional totals as separate figures in the summary strip, per §5.6 |
| Status field backfill is wrong for old events | Confirm defaults with Murdo before migration runs. Mark backfilled rows for review |
| Mobile viewport breaks the card layout | Test at 375px width as part of Phase 7 acceptance |
| LC payout figures don't reconcile with what Murdo actually pays | Out of scope for this build. Flagged separately to Murdo to resolve the 50/50 vs 55/45 split documented in the parent PRD |

---

## 10. Related decisions captured here for the record

**Budget definition (resolved in May 2026 meeting + Murdo's example format)**: The "budget" figure on the dashboard is the LC payout, i.e. what Bar Excellence pays LC for delivering the event. Not the client charge. Not the net combined revenue. Not the gross. This is the only financial figure Rory's role is permitted to see and the architecture decision in PRD v2.1 §Architecture Decision is preserved.

**Provisional events as first-class state (new, this addendum)**: Murdo currently flags these as free-text parentheticals. They are now a formal status with distinct visual treatment.

**Commission notes as separate field (new, this addendum)**: Variable income components are an annotation, not part of the headline payout figure. This keeps the totals trustworthy.

---

## 11. Sources

- Backstage PRD v2.1 (existing document in Notion)
- Bar Excellence working session, May 2026 (meeting transcript)
- Murdo's manual brief format example, sent May 2026 (four June 2026 events: Cinven, The Stoop, ICC Birmingham, NEC)
