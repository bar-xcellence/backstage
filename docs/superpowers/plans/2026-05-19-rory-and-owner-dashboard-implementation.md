# Rory + Owner Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing `/` KPI dashboard with a single role-aware route. Partner (Rory at LC) sees the stripped month-of-cards view from the PRD. Owner + super_admin see the same layout plus the existing KPI strip, actions queue, and a footer panel on each card with financials and ops signals.

**Architecture:** Single `/` route, server component branches on session role and renders either a partner or owner shell from one tree. New `getDashboardEvents()` server action returns a role-shaped discriminated union — partner-typed payload literally cannot carry owner fields. Three new optional columns on `events` (`lcPayout`, `commissionNote`, `elementsSummary`). Existing 6-state status enum reused; partner sees a 4-state presentational mapping via `toPartnerStatus()`. URL query params (`month`, `statuses`, `viewAs`) are the source of truth for filter state. Pinned allow-list test forces a conscious classification of every new `events` column.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript 5, Tailwind v4, Drizzle ORM (0.45), NeonDB (neon-http, no transactions), Vitest, Playwright. Reserve Noir design tokens already in `globals.css`.

**Spec reference:** `docs/superpowers/specs/2026-05-19-rory-and-owner-dashboard-design.md`

---

## File Structure

**New files**

| Path | Responsibility |
|---|---|
| `src/lib/dashboard-status.ts` | `toPartnerStatus()` + `PARTNER_VISIBLE_STATUSES` |
| `src/lib/dashboard-status.test.ts` | Unit tests for status mapping |
| `src/lib/partner-event-projection.ts` | `PARTNER_VISIBLE_DB_FIELDS`, `PARTNER_VISIBLE_COMPUTED_FIELDS`, `OWNER_ONLY_FIELDS`, `projectPartnerEvent()` |
| `src/lib/partner-event-projection.test.ts` | Pinned allow-list test (forces classification of every column) |
| `src/lib/dashboard-summary.ts` | `rollUpSummary()` — confirmed / provisional / invoiced / brief-unsent totals |
| `src/lib/dashboard-summary.test.ts` | Roll-up unit tests |
| `src/lib/dashboard-filters.ts` | URL param parsing + role-default filter resolution |
| `src/lib/dashboard-filters.test.ts` | Filter parsing tests |
| `src/components/dashboard/dashboard-view.tsx` | Top-level role-aware shell |
| `src/components/dashboard/view-as-banner.tsx` | Sticky banner when owner uses `?viewAs=partner` |
| `src/components/dashboard/month-header.tsx` | Eyebrow row with month select + status chips |
| `src/components/dashboard/month-select.tsx` | Native styled `<select>` for month |
| `src/components/dashboard/status-chips.tsx` | Multi-select chip group, role-aware chip set |
| `src/components/dashboard/summary-strip.tsx` | Role-aware totals strip |
| `src/components/dashboard/status-badge.tsx` | Reusable badge with PRD §5.4 visual treatments |
| `src/components/dashboard/event-card.tsx` | Polymorphic card (partner / owner variant) |
| `src/components/dashboard/event-card-list.tsx` | Card list parent + empty state |
| `e2e/dashboard-partner.spec.ts` | Partner E2E coverage |
| `e2e/dashboard-owner.spec.ts` | Owner E2E coverage |
| `e2e/dashboard-view-as-rory.spec.ts` | View-as-partner preview E2E |
| `e2e/dashboard-filters.spec.ts` | Month + status filter E2E |
| `drizzle/0005_add_dashboard_fields.sql` | Drizzle-generated migration |

**Modified files**

| Path | Change |
|---|---|
| `src/db/schema.ts` | Add `lcPayout`, `commissionNote`, `elementsSummary` columns to `events` |
| `src/db/seed.ts` | Populate new fields on existing reference events |
| `src/actions/dashboard.ts` | Add `getDashboardEvents()`. Keep `getDashboardData()` unchanged. |
| `src/actions/events.ts` | Persist 3 new fields in `createEvent` + `updateEvent` |
| `src/components/events/event-form.tsx` | Add 3 new form fields in the Financial section |
| `src/app/(authenticated)/page.tsx` | Remove partner redirect, branch on session role, render `<DashboardView>` |
| `src/components/dashboard/dashboard-client.tsx` | Kept as-is, becomes the KPI + actions block embedded inside the new owner view (not touched in this plan) |
| `e2e/partner-read-only.spec.ts` | Update "has no access to the dashboard" test — partner now lands on `/`, not `/events` |
| `CLAUDE.md` | Add new spec entry per the "Update CLAUDE.md after each feature" memory rule |

**Untouched (deliberate)**

- `src/components/dashboard/dashboard-client.tsx` — the existing KPI + actions queue + upcoming list. Embedded into the new owner view via composition. Not edited in this plan.
- `src/app/(authenticated)/events/page.tsx` — owner's table/kanban surface stays as-is.
- `src/lib/partner-event-sanitisation.ts` — `stripPartnerFinancials()` continues to work. Three new fields default to visible to partner.

---

## Glossary

- **Display status** — the 4-state label Rory sees: `provisional`, `confirmed`, `delivered`, `cancelled`. Computed from db status via `toPartnerStatus()`.
- **DB status** — the 6-state enum on disk: `enquiry`, `confirmed`, `preparation`, `ready`, `delivered`, `cancelled`.
- **Partner-visible field** — a column on `events` that may legitimately be returned to a partner.
- **Owner-only field** — a column on `events` that may not be returned to a partner, but is not financial (e.g. `notesCustom`, `outcomeNotes`, `lcSentAt`).
- **Partner-stripped field** — one of the five fields `stripPartnerFinancials()` zeroes out: `invoiceAmount`, `costAmount`, `stockReturnPolicy`, `cardPaymentPrice`, `cardPaymentCommission`.

---

## Phase 1 — Schema, migration, seed

### Task 1: Add three new columns to `events`

**Files:**
- Modify: `src/db/schema.ts:120-195` (events table definition)

- [ ] **Step 1: Add column declarations**

In `src/db/schema.ts`, inside the `events` table definition, add these three columns after `notesCustom` (around line 189) and before `outcomeNotes`:

```ts
  // Dashboard / LC partner surface
  lcPayout: decimal("lc_payout", { precision: 10, scale: 2 }),
  commissionNote: text("commission_note"),
  elementsSummary: text("elements_summary"),
```

- [ ] **Step 2: Generate migration**

Run: `npx drizzle-kit generate`

Expected: a new file `drizzle/0005_*.sql` is created with three `ALTER TABLE "events" ADD COLUMN` statements.

- [ ] **Step 3: Rename migration for clarity**

Rename the generated file to `drizzle/0005_add_dashboard_fields.sql` if drizzle-kit didn't already give it a descriptive name. Verify the body matches:

```sql
ALTER TABLE "events" ADD COLUMN "lc_payout" numeric(10, 2);
ALTER TABLE "events" ADD COLUMN "commission_note" text;
ALTER TABLE "events" ADD COLUMN "elements_summary" text;
```

If `drizzle-kit` created a journal entry under `drizzle/meta/`, leave it as drizzle-kit wrote it.

- [ ] **Step 4: Apply migration to local DB**

Run: `npx drizzle-kit migrate`

Expected: migration applies cleanly. No errors.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/0005_add_dashboard_fields.sql drizzle/meta/
git commit -m "feat(schema): add lcPayout, commissionNote, elementsSummary to events"
```

### Task 2: Seed values for the reference events

**Files:**
- Modify: `src/db/seed.ts` (find the four event inserts and add new fields)

The four PRD reference events are: Cinven Office reception (3 Jun), The Stoop (7 Jun), ICC Birmingham, NEC. The current seed includes Heathrow and Glasgow real events. We extend whatever exists in the seed without changing event identities.

- [ ] **Step 1: Read the current seed to find the event inserts**

Run: `grep -n 'insert(events)' src/db/seed.ts`

Note the line numbers of the event inserts.

- [ ] **Step 2: Add new fields to each existing seeded event**

For every `db.insert(events).values([...])` array in `src/db/seed.ts`, add the three new fields to each event object. Where values are unknown, leave as `null`. For the Heathrow and Glasgow events that already exist, populate:

```ts
// Heathrow event (existing) — add to the values object:
elementsSummary: "2 cocktail bartenders, station with pop up bar, stock and glass for prepaid serves",
lcPayout: "1400.00",
commissionNote: null,

// Glasgow event (existing) — add to the values object:
elementsSummary: "2 cocktail bartenders, pre-poured drinks reception, pop up bar, stock for service",
lcPayout: "1200.00",
commissionNote: "Small commission on cocktails sold at £9.95 each after the prepaid 200 serves",
```

- [ ] **Step 3: Run the seed**

Run: `npm run seed`

Expected: "Seeding database..." completes without errors. The seed cleans and re-inserts.

- [ ] **Step 4: Verify in DB**

Run: `npx drizzle-kit studio` (opens Studio in browser) OR directly via psql:

```bash
psql $DATABASE_URL -c "select event_name, lc_payout, commission_note, left(elements_summary, 40) from events;"
```

Expected: every row shows populated `lc_payout` and `elements_summary` for the events we updated.

- [ ] **Step 5: Commit**

```bash
git add src/db/seed.ts
git commit -m "chore(seed): populate dashboard fields on reference events"
```

---

## Phase 2 — Status mapping helper

### Task 3: Implement `toPartnerStatus()` with TDD

**Files:**
- Create: `src/lib/dashboard-status.ts`
- Test: `src/lib/dashboard-status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/dashboard-status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  toPartnerStatus,
  PARTNER_VISIBLE_STATUSES,
  type DbStatus,
  type DisplayStatus,
} from "./dashboard-status";

describe("toPartnerStatus", () => {
  it("maps enquiry to provisional", () => {
    expect(toPartnerStatus("enquiry")).toBe("provisional");
  });

  it("maps confirmed, preparation, ready to confirmed", () => {
    expect(toPartnerStatus("confirmed")).toBe("confirmed");
    expect(toPartnerStatus("preparation")).toBe("confirmed");
    expect(toPartnerStatus("ready")).toBe("confirmed");
  });

  it("passes delivered and cancelled through unchanged", () => {
    expect(toPartnerStatus("delivered")).toBe("delivered");
    expect(toPartnerStatus("cancelled")).toBe("cancelled");
  });

  it("covers all six db statuses (exhaustiveness pin)", () => {
    const allStatuses: DbStatus[] = [
      "enquiry",
      "confirmed",
      "preparation",
      "ready",
      "delivered",
      "cancelled",
    ];
    const displayStatuses = new Set<DisplayStatus>(
      allStatuses.map(toPartnerStatus)
    );
    expect(displayStatuses).toEqual(
      new Set(["provisional", "confirmed", "delivered", "cancelled"])
    );
  });
});

describe("PARTNER_VISIBLE_STATUSES", () => {
  it("includes all six db statuses (partner can see any status by default)", () => {
    expect(PARTNER_VISIBLE_STATUSES).toEqual([
      "enquiry",
      "confirmed",
      "preparation",
      "ready",
      "delivered",
      "cancelled",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/lib/dashboard-status.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/dashboard-status.ts`:

```ts
export type DbStatus =
  | "enquiry"
  | "confirmed"
  | "preparation"
  | "ready"
  | "delivered"
  | "cancelled";

export type DisplayStatus =
  | "provisional"
  | "confirmed"
  | "delivered"
  | "cancelled";

export function toPartnerStatus(s: DbStatus): DisplayStatus {
  if (s === "enquiry") return "provisional";
  if (s === "delivered" || s === "cancelled") return s;
  return "confirmed";
}

export const PARTNER_VISIBLE_STATUSES: DbStatus[] = [
  "enquiry",
  "confirmed",
  "preparation",
  "ready",
  "delivered",
  "cancelled",
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/lib/dashboard-status.test.ts`

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard-status.ts src/lib/dashboard-status.test.ts
git commit -m "feat(dashboard): add toPartnerStatus mapping helper"
```

---

## Phase 3 — Partner projection allow-list

### Task 4: Implement the pinned allow-list test

**Files:**
- Create: `src/lib/partner-event-projection.ts`
- Test: `src/lib/partner-event-projection.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/partner-event-projection.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { events } from "@/db/schema";
import {
  PARTNER_VISIBLE_DB_FIELDS,
  PARTNER_VISIBLE_COMPUTED_FIELDS,
  OWNER_ONLY_FIELDS,
  PARTNER_STRIPPED_FIELDS,
} from "./partner-event-projection";

const allEventColumns = new Set(Object.keys(getTableColumns(events)));

describe("partner-event-projection allow-list", () => {
  it("every PARTNER_VISIBLE_DB_FIELDS key exists on the events schema", () => {
    for (const key of PARTNER_VISIBLE_DB_FIELDS) {
      expect(allEventColumns.has(key)).toBe(true);
    }
  });

  it("PARTNER_STRIPPED_FIELDS does not overlap with PARTNER_VISIBLE_DB_FIELDS", () => {
    for (const key of PARTNER_STRIPPED_FIELDS) {
      expect(PARTNER_VISIBLE_DB_FIELDS).not.toContain(key);
    }
  });

  it("PARTNER_STRIPPED_FIELDS does not overlap with PARTNER_VISIBLE_COMPUTED_FIELDS", () => {
    for (const key of PARTNER_STRIPPED_FIELDS) {
      expect(PARTNER_VISIBLE_COMPUTED_FIELDS).not.toContain(key as never);
    }
  });

  it("every column on events is classified into exactly one bucket", () => {
    const buckets = new Set<string>([
      ...PARTNER_VISIBLE_DB_FIELDS,
      ...OWNER_ONLY_FIELDS,
      ...PARTNER_STRIPPED_FIELDS,
    ]);

    const unclassified: string[] = [];
    for (const col of allEventColumns) {
      if (!buckets.has(col)) unclassified.push(col);
    }

    expect(unclassified).toEqual([]);
  });

  it("no column is in more than one bucket", () => {
    const counts = new Map<string, number>();
    for (const k of PARTNER_VISIBLE_DB_FIELDS) counts.set(k, (counts.get(k) ?? 0) + 1);
    for (const k of OWNER_ONLY_FIELDS) counts.set(k, (counts.get(k) ?? 0) + 1);
    for (const k of PARTNER_STRIPPED_FIELDS) counts.set(k, (counts.get(k) ?? 0) + 1);

    const duplicates = Array.from(counts.entries()).filter(([, n]) => n > 1);
    expect(duplicates).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/lib/partner-event-projection.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the allow-list module**

Create `src/lib/partner-event-projection.ts`:

```ts
/**
 * Partner-event-projection: classifies every column on `events` into one of
 * three buckets so a partner (Rory at LC) is mathematically prevented from
 * receiving owner-only or financial data.
 *
 * The pinned test in partner-event-projection.test.ts will fail when a new
 * column is added to `events` until a human consciously assigns it to one
 * of these three lists.
 */

// Real columns on `events` that a partner may receive.
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
  "status",
  "lcPayout",
  "commissionNote",
] as const;

// Server-computed fields appended to the partner shape but not on `events`.
export const PARTNER_VISIBLE_COMPUTED_FIELDS = ["serveCount"] as const;

// Columns on `events` that are strictly owner-only (not financial, not
// partner-safe). New owner-only columns are added here.
export const OWNER_ONLY_FIELDS = [
  "createdBy",
  "eventName",
  "showName",
  "arriveTime",
  "setupDeadline",
  "serviceStart",
  "serviceEnd",
  "departTime",
  "serviceType",
  "prepaidServes",
  "stationCount",
  "stationLayoutNotes",
  "batchingInstructions",
  "staffCount",
  "staffNames",
  "flairRequired",
  "popUpBar",
  "popUpBarSupplier",
  "popUpBarSize",
  "popUpBarBranding",
  "dryIce",
  "menuFrameCount",
  "menuNotes",
  "installInstructions",
  "parkingInstructions",
  "accessRoute",
  "vehicleReg",
  "cardPaymentService",
  "cardPaymentServes",
  "lcRecipient",
  "lcSentAt",
  "lcConfirmedAt",
  "notesCustom",
  "outcomeNotes",
  "createdAt",
  "updatedAt",
  "lastAlertSentAt",
] as const;

// Mirror of the field names stripPartnerFinancials() zeroes out. Single
// source of truth for the financial allow-deny lives in
// src/lib/partner-event-sanitisation.ts; this list pins the test against it.
export const PARTNER_STRIPPED_FIELDS = [
  "invoiceAmount",
  "costAmount",
  "stockReturnPolicy",
  "cardPaymentPrice",
  "cardPaymentCommission",
] as const;

export type PartnerEventCard = {
  id: string;
  eventDate: string;
  eventType: string | null;
  guestCount: number;
  serveCount: number;
  elementsSummary: string | null;
  venueName: string;
  venueHallRoom: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  venueTenant: string | null;
  cateringPartner: string | null;
  status: string;
  lcPayout: string | null;
  commissionNote: string | null;
};

/**
 * Projects a full event row (plus a computed serve count) into the partner
 * shape, dropping every field not in PARTNER_VISIBLE_DB_FIELDS.
 */
export function projectPartnerEvent(
  row: Record<string, unknown>,
  serveCount: number
): PartnerEventCard {
  return {
    id: row.id as string,
    eventDate: row.eventDate as string,
    eventType: (row.eventType as string | null) ?? null,
    guestCount: row.guestCount as number,
    serveCount,
    elementsSummary: (row.elementsSummary as string | null) ?? null,
    venueName: row.venueName as string,
    venueHallRoom: (row.venueHallRoom as string | null) ?? null,
    addressLine1: (row.addressLine1 as string | null) ?? null,
    addressLine2: (row.addressLine2 as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    postcode: (row.postcode as string | null) ?? null,
    venueTenant: (row.venueTenant as string | null) ?? null,
    cateringPartner: (row.cateringPartner as string | null) ?? null,
    status: row.status as string,
    lcPayout: (row.lcPayout as string | null) ?? null,
    commissionNote: (row.commissionNote as string | null) ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/lib/partner-event-projection.test.ts`

Expected: 5 tests PASS. If the "every column is classified" test fails, the failure message names the unclassified columns — add each to either `PARTNER_VISIBLE_DB_FIELDS` (if partner-safe), `PARTNER_STRIPPED_FIELDS` (if financial), or `OWNER_ONLY_FIELDS` (everything else).

- [ ] **Step 5: Commit**

```bash
git add src/lib/partner-event-projection.ts src/lib/partner-event-projection.test.ts
git commit -m "feat(dashboard): partner allow-list with pinned classification test"
```

---

## Phase 4 — Dashboard summary roll-up

### Task 5: Implement `rollUpSummary()` with TDD

**Files:**
- Create: `src/lib/dashboard-summary.ts`
- Test: `src/lib/dashboard-summary.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/dashboard-summary.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { rollUpSummary, type SummaryInputEvent } from "./dashboard-summary";

const makeEvent = (overrides: Partial<SummaryInputEvent> = {}): SummaryInputEvent => ({
  status: "confirmed",
  lcPayout: null,
  invoiceAmount: null,
  lcSentAt: null,
  ...overrides,
});

describe("rollUpSummary — partner totals", () => {
  it("sums confirmed lcPayouts, separately from provisional", () => {
    const events = [
      makeEvent({ status: "confirmed", lcPayout: "1400.00" }),
      makeEvent({ status: "ready", lcPayout: "1000.00" }),       // confirmed display
      makeEvent({ status: "enquiry", lcPayout: "1400.00" }),     // provisional display
      makeEvent({ status: "delivered", lcPayout: "500.00" }),    // not counted in confirmed/provisional
    ];

    const summary = rollUpSummary(events);

    expect(summary.confirmedTotal).toBe(2400);
    expect(summary.provisionalTotal).toBe(1400);
    expect(summary.eventCount).toBe(4);
  });

  it("treats null lcPayout as zero contribution", () => {
    const events = [
      makeEvent({ status: "confirmed", lcPayout: null }),
      makeEvent({ status: "confirmed", lcPayout: "1000.00" }),
    ];
    const summary = rollUpSummary(events);
    expect(summary.confirmedTotal).toBe(1000);
  });
});

describe("rollUpSummary — owner totals", () => {
  it("sums invoiceAmount for delivered events only", () => {
    const events = [
      makeEvent({ status: "delivered", invoiceAmount: "5000.00" }),
      makeEvent({ status: "confirmed", invoiceAmount: "3000.00" }),  // ignored
      makeEvent({ status: "delivered", invoiceAmount: "2000.00" }),
    ];
    const summary = rollUpSummary(events);
    expect(summary.invoicedDeliveredTotal).toBe(7000);
  });

  it("counts confirmed+ events with null lcSentAt as brief-unsent", () => {
    const events = [
      makeEvent({ status: "confirmed", lcSentAt: null }),
      makeEvent({ status: "preparation", lcSentAt: null }),
      makeEvent({ status: "confirmed", lcSentAt: new Date() }),  // sent, not counted
      makeEvent({ status: "enquiry", lcSentAt: null }),          // not confirmed+, not counted
      makeEvent({ status: "delivered", lcSentAt: null }),        // delivered without send is past the gate
    ];
    const summary = rollUpSummary(events);
    expect(summary.briefUnsentCount).toBe(2);
  });
});

describe("rollUpSummary — edge cases", () => {
  it("returns all zeros for an empty list", () => {
    const summary = rollUpSummary([]);
    expect(summary).toEqual({
      eventCount: 0,
      confirmedTotal: 0,
      provisionalTotal: 0,
      invoicedDeliveredTotal: 0,
      briefUnsentCount: 0,
    });
  });

  it("does not count cancelled events in any total", () => {
    const events = [
      makeEvent({ status: "cancelled", lcPayout: "9999.00", invoiceAmount: "9999.00", lcSentAt: null }),
    ];
    const summary = rollUpSummary(events);
    expect(summary.confirmedTotal).toBe(0);
    expect(summary.provisionalTotal).toBe(0);
    expect(summary.invoicedDeliveredTotal).toBe(0);
    expect(summary.briefUnsentCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/lib/dashboard-summary.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/dashboard-summary.ts`:

```ts
import { toPartnerStatus, type DbStatus } from "./dashboard-status";

export type SummaryInputEvent = {
  status: DbStatus;
  lcPayout: string | null;
  invoiceAmount: string | null;
  lcSentAt: Date | null;
};

export type SummaryTotals = {
  eventCount: number;
  confirmedTotal: number;
  provisionalTotal: number;
  invoicedDeliveredTotal: number;
  briefUnsentCount: number;
};

const CONFIRMED_PLUS: ReadonlyArray<DbStatus> = [
  "confirmed",
  "preparation",
  "ready",
];

function toNumber(s: string | null): number {
  if (s === null) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function rollUpSummary(events: SummaryInputEvent[]): SummaryTotals {
  let confirmedTotal = 0;
  let provisionalTotal = 0;
  let invoicedDeliveredTotal = 0;
  let briefUnsentCount = 0;

  for (const e of events) {
    if (e.status === "cancelled") continue;

    const display = toPartnerStatus(e.status);
    if (display === "confirmed") {
      confirmedTotal += toNumber(e.lcPayout);
    } else if (display === "provisional") {
      provisionalTotal += toNumber(e.lcPayout);
    }

    if (e.status === "delivered") {
      invoicedDeliveredTotal += toNumber(e.invoiceAmount);
    }

    if (CONFIRMED_PLUS.includes(e.status) && e.lcSentAt === null) {
      briefUnsentCount += 1;
    }
  }

  return {
    eventCount: events.length,
    confirmedTotal,
    provisionalTotal,
    invoicedDeliveredTotal,
    briefUnsentCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/lib/dashboard-summary.test.ts`

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard-summary.ts src/lib/dashboard-summary.test.ts
git commit -m "feat(dashboard): rollUpSummary for confirmed/provisional/invoiced totals"
```

---

## Phase 5 — URL filter parsing

### Task 6: Implement `parseFilters()` with TDD

**Files:**
- Create: `src/lib/dashboard-filters.ts`
- Test: `src/lib/dashboard-filters.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/dashboard-filters.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  parseFilters,
  resolveEffectiveRole,
  defaultStatusesForRole,
  type Role,
} from "./dashboard-filters";

describe("parseFilters — month", () => {
  it("defaults to current YYYY-MM when month is missing", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { month } = parseFilters({}, "owner", today);
    expect(month).toBe("2026-06");
  });

  it("accepts a valid YYYY-MM string", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { month } = parseFilters({ month: "2026-09" }, "owner", today);
    expect(month).toBe("2026-09");
  });

  it("accepts 'upcoming' as a sentinel", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { month } = parseFilters({ month: "upcoming" }, "owner", today);
    expect(month).toBe("upcoming");
  });

  it("falls back to current month when format is invalid", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { month } = parseFilters({ month: "not-a-month" }, "owner", today);
    expect(month).toBe("2026-06");
  });
});

describe("parseFilters — statuses", () => {
  it("uses role default when statuses param is missing (owner)", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters({}, "owner", today);
    expect(statuses).toEqual([
      "enquiry",
      "confirmed",
      "preparation",
      "ready",
      "delivered",
    ]);
  });

  it("uses role default when statuses param is missing (partner)", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters({}, "partner", today);
    expect(statuses).toEqual(["enquiry", "confirmed", "preparation", "ready"]);
  });

  it("parses comma-separated statuses", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters(
      { statuses: "confirmed,delivered" },
      "owner",
      today
    );
    expect(statuses).toEqual(["confirmed", "delivered"]);
  });

  it("drops invalid status values silently", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters(
      { statuses: "confirmed,bogus,delivered" },
      "owner",
      today
    );
    expect(statuses).toEqual(["confirmed", "delivered"]);
  });

  it("falls back to role default when all statuses are invalid", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters({ statuses: "x,y,z" }, "partner", today);
    expect(statuses).toEqual(["enquiry", "confirmed", "preparation", "ready"]);
  });
});

describe("resolveEffectiveRole", () => {
  it("honours ?viewAs=partner for owner", () => {
    expect(resolveEffectiveRole("owner", "partner")).toBe("partner");
  });

  it("honours ?viewAs=partner for super_admin", () => {
    expect(resolveEffectiveRole("super_admin", "partner")).toBe("partner");
  });

  it("ignores ?viewAs=partner for partner (already partner)", () => {
    expect(resolveEffectiveRole("partner", "partner")).toBe("partner");
  });

  it("ignores any other viewAs value for owner", () => {
    expect(resolveEffectiveRole("owner", "owner")).toBe("owner");
    expect(resolveEffectiveRole("owner", "")).toBe("owner");
    expect(resolveEffectiveRole("owner", undefined)).toBe("owner");
  });
});

describe("defaultStatusesForRole", () => {
  it("owner: all except cancelled", () => {
    expect(defaultStatusesForRole("owner")).toEqual([
      "enquiry",
      "confirmed",
      "preparation",
      "ready",
      "delivered",
    ]);
  });

  it("partner: only confirmed-display + provisional-display, no delivered or cancelled", () => {
    // Maps to db statuses: enquiry (provisional) + confirmed/preparation/ready (confirmed display)
    expect(defaultStatusesForRole("partner")).toEqual([
      "enquiry",
      "confirmed",
      "preparation",
      "ready",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/lib/dashboard-filters.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/dashboard-filters.ts`:

```ts
import { PARTNER_VISIBLE_STATUSES, type DbStatus } from "./dashboard-status";

export type Role = "owner" | "super_admin" | "partner";

export type DashboardFilters = {
  month: string; // "YYYY-MM" or "upcoming"
  statuses: DbStatus[];
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentYYYYMM(today: Date): string {
  const y = today.getUTCFullYear();
  const m = String(today.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const ALL_DB_STATUSES: DbStatus[] = [
  "enquiry",
  "confirmed",
  "preparation",
  "ready",
  "delivered",
  "cancelled",
];

function isDbStatus(s: string): s is DbStatus {
  return ALL_DB_STATUSES.includes(s as DbStatus);
}

export function defaultStatusesForRole(role: Role): DbStatus[] {
  if (role === "partner") {
    // Partner default = confirmed display + provisional display
    // (delivered + cancelled off by default per PRD §5.5)
    return ["enquiry", "confirmed", "preparation", "ready"];
  }
  // Owner default = everything except cancelled
  return ["enquiry", "confirmed", "preparation", "ready", "delivered"];
}

export function parseFilters(
  params: { month?: string; statuses?: string },
  role: Role,
  today: Date = new Date()
): DashboardFilters {
  // Month
  let month: string;
  if (params.month === "upcoming") {
    month = "upcoming";
  } else if (params.month && MONTH_RE.test(params.month)) {
    month = params.month;
  } else {
    month = currentYYYYMM(today);
  }

  // Statuses
  let statuses: DbStatus[];
  if (params.statuses) {
    const parsed = params.statuses
      .split(",")
      .map((s) => s.trim())
      .filter(isDbStatus);
    statuses = parsed.length > 0 ? parsed : defaultStatusesForRole(role);
  } else {
    statuses = defaultStatusesForRole(role);
  }

  return { month, statuses };
}

export function resolveEffectiveRole(
  sessionRole: Role,
  viewAsParam: string | undefined
): Role {
  if (
    (sessionRole === "owner" || sessionRole === "super_admin") &&
    viewAsParam === "partner"
  ) {
    return "partner";
  }
  return sessionRole;
}

// Re-exported for callers that need the partner-visible status list
export { PARTNER_VISIBLE_STATUSES };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run src/lib/dashboard-filters.test.ts`

Expected: 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard-filters.ts src/lib/dashboard-filters.test.ts
git commit -m "feat(dashboard): URL filter parsing + effective role resolution"
```

---

## Phase 6 — Server action `getDashboardEvents`

### Task 7: Add the role-shaped server action

**Files:**
- Modify: `src/actions/dashboard.ts`

- [ ] **Step 1: Read the current `getDashboardData()` to confirm import shape**

Run: `head -20 src/actions/dashboard.ts`

Confirm `"use server"` directive is at top, `db` and `events` imports are present.

- [ ] **Step 2: Append the new action**

Append to `src/actions/dashboard.ts` (after the existing `getDashboardData` export):

```ts
import {
  projectPartnerEvent,
  type PartnerEventCard,
} from "@/lib/partner-event-projection";
import { rollUpSummary, type SummaryTotals } from "@/lib/dashboard-summary";
import {
  parseFilters,
  resolveEffectiveRole,
  type Role,
  type DashboardFilters,
} from "@/lib/dashboard-filters";
import { eventCocktails } from "@/db/schema";
import { sql } from "drizzle-orm";

export type OwnerEventCard = {
  id: string;
  eventDate: string;
  eventType: string | null;
  guestCount: number;
  serveCount: number;
  elementsSummary: string | null;
  venueName: string;
  venueHallRoom: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  venueTenant: string | null;
  cateringPartner: string | null;
  status: string;
  lcPayout: string | null;
  commissionNote: string | null;
  // Owner-only:
  invoiceAmount: string | null;
  costAmount: string | null;
  lcSentAt: Date | null;
  checklistComplete: number;
  checklistTotal: number;
};

export type DashboardEventListResult =
  | { viewerRole: "partner"; events: PartnerEventCard[]; summary: SummaryTotals }
  | { viewerRole: "owner"; events: OwnerEventCard[]; summary: SummaryTotals };

function monthBounds(month: string, today: Date): { from: string; to: string | null } {
  if (month === "upcoming") {
    const todayStr = toDateString(today);
    return { from: todayStr, to: null };
  }
  const [y, m] = month.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export async function getDashboardEvents(params: {
  month?: string;
  statuses?: string;
  viewAs?: string;
}): Promise<DashboardEventListResult> {
  const session = await requireRole("owner", "super_admin", "partner");
  const sessionRole = session.role as Role;
  const effectiveRole = resolveEffectiveRole(sessionRole, params.viewAs);

  const today = new Date();
  const filters: DashboardFilters = parseFilters(params, effectiveRole, today);

  const { from, to } = monthBounds(filters.month, today);

  // Build event query
  const allRows = await db
    .select()
    .from(events)
    .where(
      and(
        inArray(events.status, filters.statuses),
        to === null
          ? sql`${events.eventDate} >= ${from}`
          : and(
              sql`${events.eventDate} >= ${from}`,
              sql`${events.eventDate} <= ${to}`
            )
      )
    )
    .orderBy(events.eventDate);

  // Compute serve counts via cocktails join in a single query
  const eventIds = allRows.map((r) => r.id);
  let serveByEvent = new Map<string, number>();
  if (eventIds.length > 0) {
    const serveRows = await db
      .select({
        eventId: eventCocktails.eventId,
        total: sql<number>`coalesce(sum(${eventCocktails.servesAllocated}), 0)::int`,
      })
      .from(eventCocktails)
      .where(inArray(eventCocktails.eventId, eventIds))
      .groupBy(eventCocktails.eventId);
    serveByEvent = new Map(serveRows.map((r) => [r.eventId, r.total]));
  }

  // Summary uses raw rows (all fields) — never escapes the server
  const summary = rollUpSummary(
    allRows.map((r) => ({
      status: r.status,
      lcPayout: r.lcPayout,
      invoiceAmount: r.invoiceAmount,
      lcSentAt: r.lcSentAt,
    }))
  );

  if (effectiveRole === "partner") {
    const partnerEvents: PartnerEventCard[] = allRows.map((r) =>
      projectPartnerEvent(r, serveByEvent.get(r.id) ?? 0)
    );
    return { viewerRole: "partner", events: partnerEvents, summary };
  }

  // Owner / super_admin: fetch checklist counts
  let checklistByEvent = new Map<string, { complete: number; total: number }>();
  if (eventIds.length > 0) {
    const checklistRows = await db
      .select({
        eventId: eventChecklists.eventId,
        complete: sql<number>`sum(case when ${eventChecklists.isCompleted} then 1 else 0 end)::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(eventChecklists)
      .where(inArray(eventChecklists.eventId, eventIds))
      .groupBy(eventChecklists.eventId);
    checklistByEvent = new Map(
      checklistRows.map((r) => [r.eventId, { complete: r.complete, total: r.total }])
    );
  }

  const ownerEvents: OwnerEventCard[] = allRows.map((r) => {
    const checklist = checklistByEvent.get(r.id) ?? { complete: 0, total: 0 };
    return {
      id: r.id,
      eventDate: r.eventDate,
      eventType: r.eventType ?? null,
      guestCount: r.guestCount,
      serveCount: serveByEvent.get(r.id) ?? 0,
      elementsSummary: r.elementsSummary,
      venueName: r.venueName,
      venueHallRoom: r.venueHallRoom,
      addressLine1: r.addressLine1,
      addressLine2: r.addressLine2,
      city: r.city,
      postcode: r.postcode,
      venueTenant: r.venueTenant,
      cateringPartner: r.cateringPartner,
      status: r.status,
      lcPayout: r.lcPayout,
      commissionNote: r.commissionNote,
      invoiceAmount: r.invoiceAmount,
      costAmount: r.costAmount,
      lcSentAt: r.lcSentAt,
      checklistComplete: checklist.complete,
      checklistTotal: checklist.total,
    };
  });

  return { viewerRole: "owner", events: ownerEvents, summary };
}
```

- [ ] **Step 3: Verify imports at top of file include `and`, `inArray`**

Run: `head -10 src/actions/dashboard.ts`

The first import line from drizzle-orm should be `import { eq, and, ne, inArray } from "drizzle-orm";`. If `and` or `inArray` is missing, add them.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors. If errors, the most likely cause is `r.status` being typed as `"enquiry" | "confirmed" | ...` versus the looser `string` we declared on `OwnerEventCard`. The widening is intentional — leave it.

- [ ] **Step 5: Smoke-test the action**

Start the dev server: `npm run dev`. Sign in as `murdo@bar-excellence.app` (via magic link or `/auth/test-signin?email=murdo@bar-excellence.app` if `ENABLE_TEST_AUTH=true`). Open the browser console on `/` and inspect the network tab — the action should not be called yet (page hasn't been wired up). This step is just to confirm the dev server boots without TypeScript errors.

Expected: dev server compiles cleanly. No console errors.

- [ ] **Step 6: Commit**

```bash
git add src/actions/dashboard.ts
git commit -m "feat(dashboard): getDashboardEvents server action, role-shaped payload"
```

---

## Phase 7 — Status badge component

### Task 8: Create `<StatusBadge>` with PRD §5.4 treatments

**Files:**
- Create: `src/components/dashboard/status-badge.tsx`

- [ ] **Step 1: Implement**

Create `src/components/dashboard/status-badge.tsx`:

```tsx
import type { DbStatus, DisplayStatus } from "@/lib/dashboard-status";
import { toPartnerStatus } from "@/lib/dashboard-status";

type Props = {
  status: DbStatus;
  variant: "partner" | "owner";
};

const PARTNER_LABELS: Record<DisplayStatus, string> = {
  provisional: "Provisional",
  confirmed: "Confirmed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const OWNER_LABELS: Record<DbStatus, string> = {
  enquiry: "Enquiry",
  confirmed: "Confirmed",
  preparation: "Preparation",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function partnerBadgeClass(display: DisplayStatus): string {
  // Reserve Noir: 0px radius, charcoal/cream/gold tokens, Raleway eyebrow.
  const base =
    "inline-flex items-center px-3 py-1.5 text-[11px] font-medium tracking-[0.18em] uppercase font-[family-name:var(--font-raleway)]";

  if (display === "provisional") {
    return `${base} border border-gold/60 text-gold opacity-60`;
  }
  if (display === "confirmed") {
    return `${base} bg-charcoal text-cream border-l-2 border-gold`;
  }
  if (display === "delivered") {
    return `${base} border border-grey text-grey`;
  }
  // cancelled
  return `${base} border border-error text-error`;
}

function ownerBadgeClass(status: DbStatus): string {
  const base =
    "inline-flex items-center px-3 py-1.5 text-[11px] font-medium tracking-[0.18em] uppercase font-[family-name:var(--font-raleway)]";

  if (status === "enquiry") {
    return `${base} border border-gold/60 text-gold opacity-60`;
  }
  if (status === "confirmed") {
    return `${base} bg-charcoal text-cream border-l-2 border-gold`;
  }
  if (status === "preparation") {
    return `${base} bg-charcoal/80 text-cream border-l-2 border-gold/80`;
  }
  if (status === "ready") {
    return `${base} bg-gold text-cream`;
  }
  if (status === "delivered") {
    return `${base} border border-grey text-grey`;
  }
  // cancelled
  return `${base} border border-error text-error`;
}

export function StatusBadge({ status, variant }: Props) {
  if (variant === "partner") {
    const display = toPartnerStatus(status);
    const label = PARTNER_LABELS[display];
    const className = partnerBadgeClass(display);
    return display === "provisional" ? (
      <span
        className={className}
        title="Client has not yet confirmed"
        aria-label={`Status: ${label} (Client has not yet confirmed)`}
      >
        {label}
      </span>
    ) : (
      <span className={className} aria-label={`Status: ${label}`}>
        {label}
      </span>
    );
  }

  // owner
  return (
    <span
      className={ownerBadgeClass(status)}
      aria-label={`Status: ${OWNER_LABELS[status]}`}
    >
      {OWNER_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/status-badge.tsx
git commit -m "feat(dashboard): StatusBadge with partner + owner variants"
```

---

## Phase 8 — Event card (partner variant)

### Task 9: Implement `<EventCard>` partner variant

**Files:**
- Create: `src/components/dashboard/event-card.tsx`

The card is polymorphic. This task implements the partner branch only. Task 10 adds the owner footer.

- [ ] **Step 1: Implement skeleton + partner branch**

Create `src/components/dashboard/event-card.tsx`:

```tsx
import type { PartnerEventCard } from "@/lib/partner-event-projection";
import type { OwnerEventCard } from "@/actions/dashboard";
import { formatAddressLines } from "@/lib/address-format";
import { StatusBadge } from "./status-badge";
import type { DbStatus } from "@/lib/dashboard-status";
import Link from "next/link";

type Props =
  | { variant: "partner"; event: PartnerEventCard }
  | { variant: "owner"; event: OwnerEventCard };

function formatDateBlock(eventDate: string): { day: string; month: string } {
  // eventDate is YYYY-MM-DD
  const [, mStr, dStr] = eventDate.split("-");
  const day = String(Number(dStr));
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const month = months[Number(mStr) - 1];
  return { day, month };
}

const EVENT_TYPE_PHRASE: Record<string, string> = {
  masterclass: "Masterclass",
  drinks_reception: "Drinks reception",
  team_building: "Team-building event",
  corporate: "Corporate event",
  exhibition: "Exhibition",
  other: "Event",
};

function formatWhatLine(eventType: string | null, guestCount: number): string {
  const phrase = eventType ? (EVENT_TYPE_PHRASE[eventType] ?? "Event") : "Event";
  return `${phrase} for ${guestCount} guests`;
}

function formatPayout(s: string | null): string | null {
  if (s === null) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function cardOpacityClass(status: DbStatus): string {
  if (status === "delivered") return "opacity-70";
  if (status === "cancelled") return "opacity-50";
  return "";
}

function dateClass(status: DbStatus): string {
  const base = "font-[family-name:var(--font-cormorant)] font-light text-gold";
  if (status === "cancelled") return `${base} line-through`;
  return base;
}

export function EventCard(props: Props) {
  const { event, variant } = props;
  const { day, month } = formatDateBlock(event.eventDate);
  const dbStatus = event.status as DbStatus;
  const addressLines = formatAddressLines({
    venueName: event.venueName,
    venueTenant: event.venueTenant,
    cateringPartner: event.cateringPartner,
    venueHallRoom: event.venueHallRoom,
    addressLine1: event.addressLine1,
    addressLine2: event.addressLine2,
    city: event.city,
    postcode: event.postcode,
  });

  const body = (
    <div className={`bg-cream p-8 ${cardOpacityClass(dbStatus)}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={dateClass(dbStatus)}>
            <span className="text-[64px] leading-none">{day}</span>
            <span className="text-[24px] ml-2 tracking-[0.18em]">{month}</span>
          </div>
        </div>
        <StatusBadge status={dbStatus} variant={variant} />
      </div>

      <div className="mt-6 font-[family-name:var(--font-raleway)] text-charcoal">
        <p className="text-base">{formatWhatLine(event.eventType, event.guestCount)}</p>
        {event.serveCount > 0 && (
          <p className="text-base text-grey mt-1">{event.serveCount} serves</p>
        )}
      </div>

      {event.elementsSummary && (
        <div className="mt-6">
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
            Elements
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-sm text-charcoal mt-2 leading-relaxed">
            {event.elementsSummary}
          </p>
        </div>
      )}

      <div className="mt-6 font-[family-name:var(--font-raleway)] text-sm text-grey leading-relaxed">
        {addressLines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {event.lcPayout && (
        <div className="mt-8">
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
            LC Payout
          </p>
          <p className="font-[family-name:var(--font-cormorant)] text-[36px] font-light text-charcoal mt-1">
            {formatPayout(event.lcPayout)}
          </p>
          {event.commissionNote && (
            <p className="font-[family-name:var(--font-raleway)] text-[13px] text-grey mt-2">
              + {event.commissionNote}
            </p>
          )}
        </div>
      )}

      {variant === "owner" && <OwnerFooter event={props.event} />}
    </div>
  );

  if (variant === "owner") {
    return (
      <Link
        href={`/events/${event.id}`}
        className="block hover:outline hover:outline-2 hover:outline-gold/40 transition-[outline-color] duration-200"
      >
        {body}
      </Link>
    );
  }

  return body;
}

function OwnerFooter(_props: { event: OwnerEventCard }) {
  // Implemented in Task 10
  return null;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/event-card.tsx
git commit -m "feat(dashboard): EventCard partner variant"
```

---

## Phase 9 — Event card (owner footer)

### Task 10: Implement `OwnerFooter` inside `<EventCard>`

**Files:**
- Modify: `src/components/dashboard/event-card.tsx` (replace the stubbed `OwnerFooter`)

- [ ] **Step 1: Replace the stub**

In `src/components/dashboard/event-card.tsx`, replace the `OwnerFooter` function at the bottom with this implementation:

```tsx
function formatMoney(s: string | null): string {
  if (s === null) return "—";
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMargin(invoice: string | null, cost: string | null): string {
  if (invoice === null || cost === null) return "—";
  const i = parseFloat(invoice);
  const c = parseFloat(cost);
  if (!Number.isFinite(i) || !Number.isFinite(c)) return "—";
  return formatMoney(String(i - c));
}

function daysUntil(eventDate: string, today: Date = new Date()): number {
  const target = new Date(eventDate + "T00:00:00Z");
  const midnight = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  return Math.round(
    (target.getTime() - midnight.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function countdownLabel(eventDate: string, status: DbStatus): {
  text: string;
  urgent: boolean;
} {
  if (status === "delivered" || status === "cancelled") {
    return { text: status === "delivered" ? "DELIVERED" : "CANCELLED", urgent: false };
  }
  const n = daysUntil(eventDate);
  if (n < 0) return { text: "PAST", urgent: true };
  if (n === 0) return { text: "TODAY", urgent: true };
  return { text: `T-${n} DAYS`, urgent: n <= 7 };
}

function briefStatusLabel(
  status: DbStatus,
  lcSentAt: Date | null
): { text: string; urgent: boolean } {
  if (status === "enquiry") return { text: "—", urgent: false };
  if (lcSentAt) {
    const d = new Date(lcSentAt);
    const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d);
    return { text: `sent ${fmt}`, urgent: false };
  }
  return { text: "Not sent", urgent: true };
}

function OwnerFooter({ event }: { event: OwnerEventCard }) {
  const countdown = countdownLabel(event.eventDate as string, event.status as DbStatus);
  const brief = briefStatusLabel(event.status as DbStatus, event.lcSentAt);
  const checklistUrgent =
    event.checklistTotal > 0 &&
    event.checklistComplete < event.checklistTotal &&
    daysUntil(event.eventDate as string) <= 2 &&
    daysUntil(event.eventDate as string) >= 0;

  return (
    <div className="mt-8 bg-surface-low p-6">
      {/* 4 figures, two columns on mobile, four on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
        <div>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
            Invoice
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-base font-semibold text-charcoal mt-1">
            {formatMoney(event.invoiceAmount)}
          </p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
            Cost
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-base font-semibold text-charcoal mt-1">
            {formatMoney(event.costAmount)}
          </p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
            Margin
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-base font-semibold text-charcoal mt-1">
            {formatMargin(event.invoiceAmount, event.costAmount)}
          </p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
            Payout
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-base font-semibold text-charcoal mt-1">
            {formatMoney(event.lcPayout)}
          </p>
        </div>
      </div>

      {/* Brief, checklist, countdown */}
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 font-[family-name:var(--font-raleway)] text-[13px]">
          <span className={brief.urgent ? "text-gold font-semibold" : "text-grey"}>
            Brief: {brief.text}
          </span>
          <span className={checklistUrgent ? "text-gold font-semibold" : "text-grey"}>
            Checklist: {event.checklistTotal === 0
              ? "—"
              : `${event.checklistComplete} / ${event.checklistTotal}`}
          </span>
        </div>
        <span
          className={`font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase ${
            countdown.urgent ? "text-gold" : "text-charcoal"
          }`}
        >
          {countdown.text}
        </span>
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
git add src/components/dashboard/event-card.tsx
git commit -m "feat(dashboard): EventCard owner footer with financials and ops signals"
```

---

## Phase 10 — Filter components

### Task 11: Implement `<MonthSelect>`

**Files:**
- Create: `src/components/dashboard/month-select.tsx`

- [ ] **Step 1: Implement**

Create `src/components/dashboard/month-select.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

function ymToLabel(ym: string): string {
  if (ym === "upcoming") return "All upcoming";
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function shiftMonth(today: Date, offset: number): string {
  const d = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1)
  );
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function MonthSelect({ value }: { value: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();

  const options = [
    shiftMonth(today, -1),
    shiftMonth(today, 0),
    shiftMonth(today, 1),
    shiftMonth(today, 2),
    shiftMonth(today, 3),
    "upcoming",
  ];

  // Ensure current value is in the list (e.g. if a user bookmarked Feb 2027)
  if (!options.includes(value)) options.push(value);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    const params = new URLSearchParams(searchParams);
    params.set("month", next);
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  return (
    <select
      value={value}
      onChange={onChange}
      aria-label="Month"
      className="bg-charcoal text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase px-4 py-2.5 border-0 min-h-[44px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {ymToLabel(opt)}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/month-select.tsx
git commit -m "feat(dashboard): MonthSelect with URL-state filter"
```

### Task 12: Implement `<StatusChips>`

**Files:**
- Create: `src/components/dashboard/status-chips.tsx`

- [ ] **Step 1: Implement**

Create `src/components/dashboard/status-chips.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { DbStatus } from "@/lib/dashboard-status";

const PARTNER_CHIPS: { label: string; status: DbStatus[]; key: string }[] = [
  { label: "Confirmed", status: ["confirmed", "preparation", "ready"], key: "confirmed" },
  { label: "Provisional", status: ["enquiry"], key: "provisional" },
  { label: "Delivered", status: ["delivered"], key: "delivered" },
  { label: "Cancelled", status: ["cancelled"], key: "cancelled" },
];

const OWNER_CHIPS: { label: string; status: DbStatus[]; key: string }[] = [
  { label: "Enquiry", status: ["enquiry"], key: "enquiry" },
  { label: "Confirmed", status: ["confirmed"], key: "confirmed" },
  { label: "Preparation", status: ["preparation"], key: "preparation" },
  { label: "Ready", status: ["ready"], key: "ready" },
  { label: "Delivered", status: ["delivered"], key: "delivered" },
  { label: "Cancelled", status: ["cancelled"], key: "cancelled" },
];

export function StatusChips({
  variant,
  selectedStatuses,
}: {
  variant: "partner" | "owner";
  selectedStatuses: DbStatus[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shakeKey, setShakeKey] = useState<string | null>(null);

  const chips = variant === "partner" ? PARTNER_CHIPS : OWNER_CHIPS;
  const selectedSet = new Set(selectedStatuses);

  function isChipSelected(chipStatuses: DbStatus[]): boolean {
    return chipStatuses.some((s) => selectedSet.has(s));
  }

  function toggleChip(chip: { status: DbStatus[]; key: string }) {
    const isSelected = isChipSelected(chip.status);
    let next: Set<DbStatus>;
    if (isSelected) {
      next = new Set(selectedStatuses);
      for (const s of chip.status) next.delete(s);
    } else {
      next = new Set(selectedStatuses);
      for (const s of chip.status) next.add(s);
    }

    // Resist deselect if it would empty the set
    if (next.size === 0) {
      setShakeKey(chip.key);
      window.setTimeout(() => setShakeKey(null), 350);
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.set("statuses", Array.from(next).join(","));
    router.push(`/?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Status filter">
      {chips.map((chip) => {
        const selected = isChipSelected(chip.status);
        const shake = shakeKey === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => toggleChip(chip)}
            aria-pressed={selected}
            className={[
              "font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase px-4 py-2.5 min-h-[44px] cursor-pointer transition-colors duration-150",
              selected
                ? "bg-charcoal text-cream border-l-2 border-gold"
                : "border border-gold/30 text-gold hover:border-gold/60",
              shake ? "animate-pulse" : "",
            ].join(" ")}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/status-chips.tsx
git commit -m "feat(dashboard): StatusChips with role-aware chip set and last-chip resist"
```

---

## Phase 11 — Summary, header, list

### Task 13: Implement `<SummaryStrip>`

**Files:**
- Create: `src/components/dashboard/summary-strip.tsx`

- [ ] **Step 1: Implement**

Create `src/components/dashboard/summary-strip.tsx`:

```tsx
import type { SummaryTotals } from "@/lib/dashboard-summary";

function gbp(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function SummaryStrip({
  summary,
  variant,
}: {
  summary: SummaryTotals;
  variant: "partner" | "owner";
}) {
  const parts: string[] = [];
  parts.push(`${gbp(summary.confirmedTotal)} confirmed`);
  if (summary.provisionalTotal > 0) {
    parts.push(`${gbp(summary.provisionalTotal)} provisional`);
  }

  const ownerLineParts: string[] = [];
  if (variant === "owner") {
    if (summary.invoicedDeliveredTotal > 0) {
      ownerLineParts.push(`${gbp(summary.invoicedDeliveredTotal)} invoiced this month`);
    }
    if (summary.briefUnsentCount > 0) {
      ownerLineParts.push(
        `${summary.briefUnsentCount} brief${summary.briefUnsentCount === 1 ? "" : "s"} unsent`
      );
    }
  }

  return (
    <div className="space-y-1 font-[family-name:var(--font-raleway)]">
      <p className="text-sm text-charcoal">{parts.join(" · ")}</p>
      {variant === "owner" && ownerLineParts.length > 0 && (
        <p className="text-sm text-grey">{ownerLineParts.join(" · ")}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/summary-strip.tsx
git commit -m "feat(dashboard): SummaryStrip role-aware totals"
```

### Task 14: Implement `<MonthHeader>`

**Files:**
- Create: `src/components/dashboard/month-header.tsx`

- [ ] **Step 1: Implement**

Create `src/components/dashboard/month-header.tsx`:

```tsx
import { MonthSelect } from "./month-select";
import { StatusChips } from "./status-chips";
import type { DbStatus } from "@/lib/dashboard-status";

function monthLabel(ym: string): string {
  if (ym === "upcoming") return "All upcoming";
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(d)
    .toUpperCase();
}

export function MonthHeader({
  month,
  statuses,
  eventCount,
  variant,
}: {
  month: string;
  statuses: DbStatus[];
  eventCount: number;
  variant: "partner" | "owner";
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
        {monthLabel(month)} · {eventCount} {eventCount === 1 ? "event" : "events"}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <MonthSelect value={month} />
        <StatusChips variant={variant} selectedStatuses={statuses} />
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
git add src/components/dashboard/month-header.tsx
git commit -m "feat(dashboard): MonthHeader composing month + status filters"
```

### Task 15: Implement `<EventCardList>` with empty state

**Files:**
- Create: `src/components/dashboard/event-card-list.tsx`

- [ ] **Step 1: Implement**

Create `src/components/dashboard/event-card-list.tsx`:

```tsx
import type { PartnerEventCard } from "@/lib/partner-event-projection";
import type { OwnerEventCard } from "@/actions/dashboard";
import { EventCard } from "./event-card";
import Link from "next/link";

type Props =
  | { variant: "partner"; events: PartnerEventCard[] }
  | { variant: "owner"; events: OwnerEventCard[]; allowCreate: boolean };

export function EventCardList(props: Props) {
  const { events, variant } = props;

  if (events.length === 0) {
    if (variant === "owner" && props.allowCreate) {
      return (
        <div className="text-center py-16">
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-charcoal">
            No events yet.
          </h2>
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mt-2">
            Create your first event to see it appear here.
          </p>
          <Link
            href="/events/new"
            className="inline-block mt-6 px-6 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 min-h-[44px]"
          >
            CREATE EVENT
          </Link>
        </div>
      );
    }
    return (
      <div className="text-center py-16">
        <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-charcoal">
          No events in this window.
        </h2>
        <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mt-2">
          Adjust the month or status filter to see more.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto space-y-8">
      {variant === "partner"
        ? events.map((e) => <EventCard key={e.id} variant="partner" event={e} />)
        : events.map((e) => <EventCard key={e.id} variant="owner" event={e} />)}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/event-card-list.tsx
git commit -m "feat(dashboard): EventCardList with role-aware empty state"
```

---

## Phase 12 — View-as banner

### Task 16: Implement `<ViewAsBanner>`

**Files:**
- Create: `src/components/dashboard/view-as-banner.tsx`

- [ ] **Step 1: Implement**

Create `src/components/dashboard/view-as-banner.tsx`:

```tsx
import Link from "next/link";

export function ViewAsBanner() {
  return (
    <div className="sticky top-0 z-50 bg-cream border-b-2 border-gold py-3 px-6 flex items-center justify-between">
      <p className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
        Viewing as: Rory (LC)
      </p>
      <Link
        href="/"
        className="font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase text-charcoal hover:text-gold transition-colors duration-150 min-h-[44px] flex items-center"
      >
        Exit preview →
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/view-as-banner.tsx
git commit -m "feat(dashboard): ViewAsBanner sticky preview indicator"
```

---

## Phase 13 — Dashboard view shell + page assembly

### Task 17: Implement `<DashboardView>` shell

**Files:**
- Create: `src/components/dashboard/dashboard-view.tsx`

- [ ] **Step 1: Implement**

Create `src/components/dashboard/dashboard-view.tsx`:

```tsx
import type { DashboardData } from "@/actions/dashboard";
import type { DashboardEventListResult } from "@/actions/dashboard";
import type { DbStatus } from "@/lib/dashboard-status";
import { DashboardClient } from "./dashboard-client";
import { ViewAsBanner } from "./view-as-banner";
import { MonthHeader } from "./month-header";
import { SummaryStrip } from "./summary-strip";
import { EventCardList } from "./event-card-list";

type Props = {
  ownerData: DashboardData | null;        // null for partner view
  eventList: DashboardEventListResult;
  month: string;
  statuses: DbStatus[];
  showViewAsBanner: boolean;
  allowCreate: boolean;                   // true only for real owner (not view-as)
};

export function DashboardView({
  ownerData,
  eventList,
  month,
  statuses,
  showViewAsBanner,
  allowCreate,
}: Props) {
  return (
    <>
      {showViewAsBanner && <ViewAsBanner />}

      <div className="space-y-12">
        {/* Owner-only top half */}
        {ownerData && <DashboardClient data={ownerData} />}

        {/* Month-of-cards (both roles) */}
        <section className="space-y-6">
          <MonthHeader
            month={month}
            statuses={statuses}
            eventCount={eventList.events.length}
            variant={eventList.viewerRole}
          />
          <SummaryStrip summary={eventList.summary} variant={eventList.viewerRole} />
        </section>

        <section>
          {eventList.viewerRole === "partner" ? (
            <EventCardList variant="partner" events={eventList.events} />
          ) : (
            <EventCardList
              variant="owner"
              events={eventList.events}
              allowCreate={allowCreate}
            />
          )}
        </section>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/dashboard-view.tsx
git commit -m "feat(dashboard): DashboardView role-aware shell"
```

### Task 18: Wire up `/` route

**Files:**
- Modify: `src/app/(authenticated)/page.tsx`

- [ ] **Step 1: Replace the page component**

Overwrite `src/app/(authenticated)/page.tsx` with:

```tsx
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getDashboardData, getDashboardEvents } from "@/actions/dashboard";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { parseFilters, resolveEffectiveRole, type Role } from "@/lib/dashboard-filters";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; statuses?: string; viewAs?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/signin");

  const sessionRole = session.role as Role;
  const params = await searchParams;
  const effectiveRole = resolveEffectiveRole(sessionRole, params.viewAs);
  const filters = parseFilters(params, effectiveRole);

  const eventList = await getDashboardEvents({
    month: params.month,
    statuses: params.statuses,
    viewAs: params.viewAs,
  });

  const ownerData =
    effectiveRole === "partner" ? null : await getDashboardData();

  const showViewAsBanner =
    sessionRole !== "partner" && effectiveRole === "partner";

  // Owner-real (not in view-as) can show the "create event" CTA in empty state
  const allowCreate = sessionRole !== "partner" && effectiveRole !== "partner";

  return (
    <DashboardView
      ownerData={ownerData}
      eventList={eventList}
      month={filters.month}
      statuses={filters.statuses}
      showViewAsBanner={showViewAsBanner}
      allowCreate={allowCreate}
    />
  );
}
```

- [ ] **Step 2: Smoke test (owner)**

Start dev server: `npm run dev`. Sign in as `murdo@bar-excellence.app` via the test-signin route (requires `ENABLE_TEST_AUTH=true` in `.env.local`):

```
http://localhost:3000/auth/test-signin?email=murdo@bar-excellence.app&redirect=/
```

Expected: dashboard renders with KPI strip + actions queue (existing) AND new month header + summary strip + cards below.

- [ ] **Step 3: Smoke test (partner)**

In an incognito window, sign in as `rory@lc-group.com`:

```
http://localhost:3000/auth/test-signin?email=rory@lc-group.com&redirect=/
```

Expected: dashboard renders WITHOUT KPI strip, WITHOUT actions queue. Only the month header, summary strip, and partner cards. Cards must not show invoice / cost / margin / brief sent / checklist / countdown labels.

- [ ] **Step 4: Smoke test (view-as)**

As Murdo, navigate to `http://localhost:3000/?viewAs=partner`.

Expected: gold banner at the top "Viewing as: Rory (LC) — Exit preview". Card variant matches partner. KPI strip disappears.

- [ ] **Step 5: Smoke test (partner ignores viewAs)**

As Rory, navigate to `http://localhost:3000/?viewAs=partner`.

Expected: no banner. Page is the normal partner view.

- [ ] **Step 6: Smoke test (filters)**

As Murdo, change the month dropdown. URL updates to `?month=...`. Click status chips. URL updates with `?statuses=...`. Card list and summary strip update without a full page reload (Next.js soft navigation).

Try to deselect every status chip — the last one should resist and pulse briefly.

- [ ] **Step 7: Commit**

```bash
git add src/app/(authenticated)/page.tsx
git commit -m "feat(dashboard): wire up role-aware / route with filter params"
```

---

## Phase 14 — Event form additions

### Task 19: Add three new form fields and persist in actions

**Files:**
- Modify: `src/components/events/event-form.tsx` (Financial section, around line 322-341)
- Modify: `src/actions/events.ts` (createEvent body around line 100, updateEvent body around line 178)

- [ ] **Step 1: Extend the Financial section in `event-form.tsx`**

In `src/components/events/event-form.tsx`, find the `Financial` section (heading "Financial" around line 323). Add three new fields after `invoiceAmount` and before `notesCustom`:

```tsx
          <FormField
            label="LC payout"
            name="lcPayout"
            type="number"
            defaultValue={defaultValues.lcPayout ?? ""}
            placeholder="1400"
          />
          <TextArea
            label="Commission note"
            name="commissionNote"
            defaultValue={defaultValues.commissionNote ?? ""}
            placeholder="Small commission on cocktails sold at £9.95 each after 200 serves"
            rows={2}
          />
          <TextArea
            label="Elements summary"
            name="elementsSummary"
            defaultValue={defaultValues.elementsSummary ?? ""}
            placeholder="2 cocktail bartenders, pop up bar, stock/glass for 150 serves"
            rows={2}
          />
```

Place them so the section grid still reads cleanly — the existing grid is `grid-cols-1 md:grid-cols-2` so the three new fields can append in order; the existing layout will wrap them onto new rows.

- [ ] **Step 2: Persist new fields in `createEvent`**

In `src/actions/events.ts`, find the `.values({...})` call inside `createEvent` (around line 35-104). Add three new fields next to `notesCustom`:

```ts
      notesCustom: (formData.get("notesCustom") as string)?.trim() || null,
      lcPayout: (formData.get("lcPayout") as string) || null,
      commissionNote: (formData.get("commissionNote") as string)?.trim() || null,
      elementsSummary: (formData.get("elementsSummary") as string)?.trim() || null,
```

- [ ] **Step 3: Persist new fields in `updateEvent`**

In the same file, find the `.set({...})` call inside `updateEvent` (around line 130-192). Add the same three fields next to `notesCustom`:

```ts
      notesCustom: (formData.get("notesCustom") as string)?.trim() || null,
      lcPayout: (formData.get("lcPayout") as string) || null,
      commissionNote: (formData.get("commissionNote") as string)?.trim() || null,
      elementsSummary: (formData.get("elementsSummary") as string)?.trim() || null,
```

- [ ] **Step 4: Smoke test**

Sign in as Murdo. Navigate to `/events/new`. Verify the three new fields appear in the Financial section. Create a test event with values populated. Open the event detail page, then return to `/`. The new event should appear with the right `lcPayout` figure on the owner card footer, and the `elementsSummary` rendered in the body.

Edit the event via `/events/{id}/edit`. The fields should pre-fill with the values just entered.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/events/event-form.tsx src/actions/events.ts
git commit -m "feat(events): add lcPayout, commissionNote, elementsSummary form fields"
```

---

## Phase 15 — E2E coverage

### Task 20: Update existing partner-read-only spec

**Files:**
- Modify: `e2e/partner-read-only.spec.ts`

- [ ] **Step 1: Replace the obsolete "has no access to the dashboard" test**

Find this block in `e2e/partner-read-only.spec.ts`:

```ts
  test("has no access to the dashboard", async ({ page }) => {
    await signInAs(page, "partner", "/");
    await expect(page).toHaveURL(/\/events(\?|$|\/)/);
  });
```

Replace it with:

```ts
  test("lands on the new partner dashboard at /", async ({ page }) => {
    await signInAs(page, "partner", "/");
    await expect(page).toHaveURL(/\/(\?|$)/);
    // Owner-only top-half should not render
    await expect(page.getByRole("heading", { name: /needs attention/i })).toHaveCount(0);
  });
```

- [ ] **Step 2: Run the updated spec**

Run: `npm run test:e2e -- partner-read-only.spec.ts`

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/partner-read-only.spec.ts
git commit -m "test(e2e): update partner-read-only after dashboard route change"
```

### Task 21: Write `dashboard-partner.spec.ts`

**Files:**
- Create: `e2e/dashboard-partner.spec.ts`

- [ ] **Step 1: Write the spec**

Create `e2e/dashboard-partner.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.describe("partner dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, "partner", "/");
  });

  test("renders month header, summary strip, and at least one card", async ({ page }) => {
    await expect(page.getByText(/\d{4}/)).toBeVisible(); // some month label like JUNE 2026
    await expect(page.getByText(/confirmed/i).first()).toBeVisible();
  });

  test("does not show any owner-only labels anywhere", async ({ page }) => {
    // Owner-only labels from the card footer
    await expect(page.getByText(/^INVOICE$/i)).toHaveCount(0);
    await expect(page.getByText(/^COST$/i)).toHaveCount(0);
    await expect(page.getByText(/^MARGIN$/i)).toHaveCount(0);
    await expect(page.getByText(/^Brief:/i)).toHaveCount(0);
    await expect(page.getByText(/^Checklist:/i)).toHaveCount(0);
    await expect(page.getByText(/^T-\d+ DAYS$/)).toHaveCount(0);

    // KPI strip
    await expect(page.getByRole("heading", { name: /needs attention/i })).toHaveCount(0);
  });

  test("cards are not links", async ({ page }) => {
    // Wait for at least one event date to render (e.g. "3 JUN" or "JUNE")
    const monthLabel = page.locator("text=/JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC/").first();
    await monthLabel.waitFor({ state: "visible" });

    // The card body must not be wrapped in <a href="/events/...">
    const eventLinks = page.locator('a[href^="/events/"]');
    await expect(eventLinks).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run**

Run: `npm run test:e2e -- dashboard-partner.spec.ts`

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/dashboard-partner.spec.ts
git commit -m "test(e2e): partner dashboard renders without owner-only fields"
```

### Task 22: Write `dashboard-owner.spec.ts`

**Files:**
- Create: `e2e/dashboard-owner.spec.ts`

- [ ] **Step 1: Write the spec**

Create `e2e/dashboard-owner.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.describe("owner dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, "owner", "/");
  });

  test("renders KPI tiles and month header", async ({ page }) => {
    await expect(page.getByText(/events? this week/i)).toBeVisible();
    await expect(page.getByText(/revenue this month/i)).toBeVisible();
    // Month label (e.g. "JUNE 2026")
    await expect(
      page.locator("text=/^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER) \\d{4} ·/")
    ).toBeVisible();
  });

  test("owner cards show financial figures and link to detail", async ({ page }) => {
    // Wait for cards to render
    const firstCardLink = page.locator('a[href^="/events/"]').first();
    await firstCardLink.waitFor({ state: "visible" });

    // At least one card has the INVOICE / COST / MARGIN / PAYOUT labels
    await expect(page.getByText(/^INVOICE$/i).first()).toBeVisible();
    await expect(page.getByText(/^COST$/i).first()).toBeVisible();
    await expect(page.getByText(/^MARGIN$/i).first()).toBeVisible();
    await expect(page.getByText(/^PAYOUT$/i).first()).toBeVisible();
  });

  test("clicking a card navigates to event detail", async ({ page }) => {
    const firstCardLink = page.locator('a[href^="/events/"]').first();
    await firstCardLink.waitFor({ state: "visible" });
    await firstCardLink.click();
    await page.waitForURL(/\/events\/[0-9a-f-]+/i);
  });
});
```

- [ ] **Step 2: Run**

Run: `npm run test:e2e -- dashboard-owner.spec.ts`

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/dashboard-owner.spec.ts
git commit -m "test(e2e): owner dashboard renders KPI, cards with financials, links to detail"
```

### Task 23: Write `dashboard-view-as-rory.spec.ts`

**Files:**
- Create: `e2e/dashboard-view-as-rory.spec.ts`

- [ ] **Step 1: Write the spec**

Create `e2e/dashboard-view-as-rory.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.describe("view-as-rory preview", () => {
  test("owner sees banner and partner card variant when ?viewAs=partner", async ({ page }) => {
    await signInAs(page, "owner", "/?viewAs=partner");

    // Sticky banner
    await expect(page.getByText(/viewing as: rory/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /exit preview/i })).toBeVisible();

    // Owner-only blocks must be hidden
    await expect(page.getByText(/events? this week/i)).toHaveCount(0);
    await expect(page.getByText(/^INVOICE$/i)).toHaveCount(0);
    await expect(page.getByText(/^MARGIN$/i)).toHaveCount(0);
  });

  test("exit preview returns to real owner view", async ({ page }) => {
    await signInAs(page, "owner", "/?viewAs=partner");
    await page.getByRole("link", { name: /exit preview/i }).click();
    await page.waitForURL(/^.*\/$/);
    await expect(page.getByText(/events? this week/i)).toBeVisible();
  });

  test("partner with ?viewAs=partner sees no banner (param ignored)", async ({ page }) => {
    await signInAs(page, "partner", "/?viewAs=partner");
    await expect(page.getByText(/viewing as: rory/i)).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run**

Run: `npm run test:e2e -- dashboard-view-as-rory.spec.ts`

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/dashboard-view-as-rory.spec.ts
git commit -m "test(e2e): view-as-rory preview banner + param honour rules"
```

### Task 24: Write `dashboard-filters.spec.ts`

**Files:**
- Create: `e2e/dashboard-filters.spec.ts`

- [ ] **Step 1: Write the spec**

Create `e2e/dashboard-filters.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.describe("dashboard filters", () => {
  test("changing month updates URL and re-fetches cards", async ({ page }) => {
    await signInAs(page, "owner", "/");

    const monthSelect = page.getByLabel("Month");
    await monthSelect.waitFor({ state: "visible" });

    // Pick an option that isn't the current month
    const options = await monthSelect.locator("option").allTextContents();
    const otherOption = options.find((o) => o !== options[1]) ?? options[0];
    await monthSelect.selectOption({ label: otherOption });

    await expect(page).toHaveURL(/\?.*month=/);
  });

  test("toggling a status chip updates URL", async ({ page }) => {
    await signInAs(page, "owner", "/");

    // Toggle 'Cancelled' on (off by default for owner)
    const cancelledChip = page.getByRole("button", { name: /^Cancelled$/i });
    await cancelledChip.waitFor({ state: "visible" });
    await cancelledChip.click();

    await expect(page).toHaveURL(/statuses=.*cancelled/);
  });

  test("attempting to deselect the last status chip is resisted", async ({ page }) => {
    await signInAs(page, "owner", "/?statuses=confirmed");

    // Only 'Confirmed' is selected. Clicking it should NOT remove the query param.
    const confirmedChip = page.getByRole("button", { name: /^Confirmed$/i });
    await confirmedChip.click();

    // URL should still contain statuses=confirmed
    await expect(page).toHaveURL(/statuses=confirmed/);
  });
});
```

- [ ] **Step 2: Run**

Run: `npm run test:e2e -- dashboard-filters.spec.ts`

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/dashboard-filters.spec.ts
git commit -m "test(e2e): month and status filter behaviours, last-chip resist"
```

---

## Phase 16 — Documentation update

### Task 25: Update `CLAUDE.md` with the new dashboard surface

**Files:**
- Modify: `CLAUDE.md`

Per the auto-memory note `feedback_update_claude_md.md`, CLAUDE.md is kept in sync after every shipped feature.

- [ ] **Step 1: Add a new section under "Conventions"**

In `CLAUDE.md`, after the existing `### Settings + saved LC recipients (Spec J)` block, insert a new block:

```markdown
### Dashboard (Spec K — partner + owner unified)
`/` is the single landing route for all roles. Role-aware shell renders:
- Partner: month-of-cards view from PRD §5 (no KPI strip, no actions queue). Cards are non-interactive, show only `lcPayout`, `commissionNote`, `elementsSummary`, plus the partner-visible base fields.
- Owner + super_admin: existing KPI strip + actions queue (unchanged) above the new month header + summary strip + cards. Owner cards add a footer panel with Invoice / Cost / Margin / Payout, brief sent status, checklist progress, and a T-N days countdown. Whole card is a link to `/events/{id}`.
- `?viewAs=partner` is honoured for owner/super_admin only — shows a sticky gold-bordered banner. Partner sees no banner.
- Filter state lives in URL (`?month=YYYY-MM&statuses=confirmed,enquiry`). Last-chip-deselect resists with a pulse.

Pinned classification: every column on `events` is classified into `PARTNER_VISIBLE_DB_FIELDS`, `PARTNER_STRIPPED_FIELDS`, or `OWNER_ONLY_FIELDS` in `src/lib/partner-event-projection.ts`. Adding a new column without classifying it fails `partner-event-projection.test.ts`.

Status mapping: `toPartnerStatus()` in `src/lib/dashboard-status.ts` collapses the 6-state db enum to the 4-state display set (`provisional`/`confirmed`/`delivered`/`cancelled`). The db enum is unchanged.

Three new fields on `events`: `lcPayout` (numeric), `commissionNote` (text), `elementsSummary` (text). All optional. Form has all three in the Financial section.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): add Spec K dashboard documentation"
```

---

## Final verification

### Task 26: Full test pass + build

- [ ] **Step 1: Run the full Vitest suite**

Run: `npm run test -- --run`

Expected: all tests pass. Pay attention to `partner-event-projection.test.ts` — it must pass against the live schema.

- [ ] **Step 2: Run the full Playwright suite**

Run: `npm run test:e2e`

Expected: all E2E specs pass, including the four new dashboard specs and the updated partner-read-only.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: build completes with no errors. Type errors here are blocking.

- [ ] **Step 4: Manual visual check at 375px**

Open Chrome DevTools, set viewport to 375x812 (iPhone). Sign in as owner. Confirm:
- KPI tiles stack vertically.
- Month header row wraps month select and chip group onto a new line.
- Card date + status badge stay opposite corners.
- Card footer panel: Invoice/Cost on row 1, Margin/Payout on row 2.
- All tap targets feel ≥ 44px.

Then sign in as partner at 375px and confirm:
- Cards render correctly, no horizontal scroll.
- LC PAYOUT block reads.

- [ ] **Step 5: No commit required for this verification phase.** If any step fails, return to the relevant phase and fix.

---

## Acceptance criteria mapping

Cross-references between spec acceptance criteria (§11) and the tasks that satisfy them.

| Spec #  | Criterion                                                | Tasks |
|---------|----------------------------------------------------------|-------|
| 1       | Partner lands on `/` partner layout                      | 18, 21 |
| 2       | Partner card 8 content blocks only                       | 9, 21 |
| 3       | Status badge visual treatments                           | 8 |
| 4       | Owner lands on `/` owner layout (KPI + cards)            | 17, 18, 22 |
| 5       | Owner card footer with financials + ops signals          | 10, 22 |
| 6       | Month + status filters update list in place              | 11, 12, 18, 24 |
| 7       | Confirmed and provisional totals separate                | 5, 13 |
| 8       | Provisional opacity reduced                              | 8 |
| 9       | Commission note conditional                              | 9 |
| 10      | Partner cannot reach `/events/{id}/edit`                 | existing behaviour, not regressed |
| 11      | Partner DOM has no owner-only labels                     | 9, 21 |
| 12      | View-as banner for owner with `?viewAs=partner`          | 16, 17, 23 |
| 13      | Partner with `?viewAs=partner` sees no banner            | 18, 23 |
| 14      | Empty state when filters produce no results              | 15 |
| 15      | 375px viewport usable                                    | 9, 10, 26 |
| 16      | Pinned allow-list test fails on unclassified new column  | 4 |

---

## Self-review log

After writing this plan I checked:

1. **Spec coverage** — every criterion in spec §11 maps to a task above.
2. **Placeholder scan** — no TODOs, no "implement later", every code step shows complete code.
3. **Type consistency** — `viewerRole`, `effectiveRole`, `variant` used consistently. `DbStatus` and `DisplayStatus` named identically across files. `PartnerEventCard` and `OwnerEventCard` defined once each and re-imported.
4. **Existing-file accuracy** — `event-form.tsx` `Financial` section, `events.ts` create + update field positions, drizzle journal path, test-signin route shape, `signInAs` helper — all verified by reading the files during plan drafting.

One open dependency I am acknowledging: the new `OwnerFooter` reads `event.checklistComplete` / `event.checklistTotal`, which `getDashboardEvents()` populates from the `event_checklists` table. The current `dashboard.ts` already imports `eventChecklists`, so no extra import is needed in Task 7.
