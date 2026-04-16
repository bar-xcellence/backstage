# Phase 3: Partner View & Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give Rory (partner role) a read-only view of confirmed+ events, add 48-hour alert emails, extract shared constants, and optimise the dashboard query.

**Architecture:** The data layer already filters by role (listEvents, getEvent strip financials and filter to confirmed+ for partner). Phase 3 wires the UI to respect role: hiding tabs, buttons, and the dashboard route for partner users. The session is already available in the server component via getSession(). We pass the role down to the event detail page to conditionally render.

**Tech Stack:** Next.js 16.2, React 19, TypeScript 5, Tailwind v4, Drizzle ORM, iron-session, Resend

---

## Task 1: Partner guard on Dashboard route

The dashboard (`/` route) must redirect partner users to `/events`. Currently `getDashboardData()` calls `requireRole("owner", "super_admin")` which throws for partner — this crashes instead of redirecting gracefully.

**Files:**
- Modify: `src/app/(authenticated)/page.tsx`

**Step 1: Add role check and redirect**

Replace the entire file content:

```tsx
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/actions/dashboard";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  if (session.role === "partner") redirect("/events");

  const data = await getDashboardData();
  return <DashboardClient data={data} />;
}
```

**Step 2: Verify manually**

Log in as partner (rory@lc-group.com). Navigate to `/`. Should redirect to `/events`.

**Step 3: Commit**

```bash
git add src/app/(authenticated)/page.tsx
git commit -m "fix: redirect partner users from dashboard to events"
```

---

## Task 2: Pass session role to event detail page

The event detail page needs to know the user's role to hide UI elements. Currently it doesn't fetch the session — it relies on server actions for auth. We need the role to conditionally render tabs and buttons.

**Files:**
- Modify: `src/app/(authenticated)/events/[id]/page.tsx`

**Step 1: Fetch session and pass role**

At the top of `EventDetailPage`, after `const { id } = await params;`, add:

```tsx
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
```

Then inside the function, before `const event = await getEvent(id);`:

```tsx
const session = await getSession();
if (!session) redirect("/auth/signin");
const isPartner = session.role === "partner";
```

**Step 2: Skip checklist fetch for partner**

The current code calls `getEventChecklist(id)` which throws "Forbidden" for partner. Change:

```tsx
// Before:
const checklist = await getEventChecklist(id);

// After:
const checklist = isPartner ? [] : await getEventChecklist(id);
```

**Step 3: Conditionally build tabs array**

Replace the tabs definition:

```tsx
const tabs = [
  { id: "overview", label: "Overview" },
  { id: "cocktails", label: `Cocktails (${eventCocktails.length})` },
  { id: "stock", label: "Stock List" },
  ...(!isPartner
    ? [
        {
          id: "checklist",
          label: `Checklist (${checklist.filter((c) => c.isCompleted).length}/${checklist.length})`,
        },
        { id: "edit", label: "Edit" },
      ]
    : []),
];
```

**Step 4: Hide action buttons for partner**

Wrap the header actions `<div>` in a partner check:

```tsx
{!isPartner && (
  <div className="flex items-center gap-3">
    <DownloadPDFButton eventId={id} />
    <SendToLCButton eventId={id} />
    {STATUS_ORDER.indexOf(event.status) < STATUS_ORDER.length - 1 && (
      <form action={advanceStatus}>
        <button
          type="submit"
          className="px-5 py-2.5 border border-gold text-gold font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold hover:text-cream transition-colors duration-200 min-h-[44px] cursor-pointer"
        >
          ADVANCE TO{" "}
          {STATUS_ORDER[
            STATUS_ORDER.indexOf(event.status) + 1
          ].toUpperCase()}
        </button>
      </form>
    )}
  </div>
)}
```

**Step 5: Hide checklist and edit tab content for partner**

In the EventTabs children object, wrap checklist and edit entries:

```tsx
...(!isPartner && {
  checklist: (
    <EventChecklist
      eventId={id}
      items={checklist}
      eventStatus={event.status}
    />
  ),
  edit: (
    <EventForm
      action={updateWithId}
      defaultValues={
        event as unknown as Record<string, string | number | null>
      }
      submitLabel="SAVE CHANGES"
    />
  ),
}),
```

**Step 6: Verify manually**

Log in as partner. Navigate to an event detail page. Should see: Overview, Cocktails, Stock List tabs only. No Send to LC, no Download Brief, no Advance Status, no Edit tab, no Checklist tab.

**Step 7: Commit**

```bash
git add src/app/(authenticated)/events/[id]/page.tsx
git commit -m "feat: partner view — hide edit, checklist, actions on event detail"
```

---

## Task 3: Partner empty state

Per the design doc: "No upcoming events. Briefs will appear here once Murdo confirms them." when partner has no confirmed+ events.

**Files:**
- Modify: `src/app/(authenticated)/events/page.tsx`

**Step 1: Read the events page**

Read the file to understand the current empty state rendering.

**Step 2: Add role-aware empty state**

After fetching events and session, if partner and no events:

```tsx
{events.length === 0 && isPartner && (
  <div className="text-center py-16">
    <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-charcoal tracking-tight mb-3">
      No upcoming events
    </h2>
    <p className="font-[family-name:var(--font-raleway)] text-sm text-grey max-w-md mx-auto">
      Briefs will appear here once Murdo confirms them. You&apos;ll see event details, cocktail specs, and stock lists for all confirmed events.
    </p>
  </div>
)}
```

**Step 3: Hide ADD EVENT button for partner**

The events page header likely has an "ADD EVENT" button. Wrap it:

```tsx
{!isPartner && (
  <Link href="/events/new" className="...">ADD EVENT</Link>
)}
```

**Step 4: Verify and commit**

```bash
git add src/app/(authenticated)/events/page.tsx
git commit -m "feat: partner empty state and hide add-event button"
```

---

## Task 4: Partner guard on event creation and editing routes

Partner must not access `/events/new` or the Edit tab server actions.

**Files:**
- Modify: `src/app/(authenticated)/events/new/page.tsx` (if it exists — check first)
- Verify: `src/actions/events.ts` — `createEvent` and `updateEvent` already require `owner`/`super_admin`

**Step 1: Check that createEvent/updateEvent are partner-safe**

Read `src/actions/events.ts` lines 1-30. Verify `createEvent` calls `requireRole("owner", "super_admin")`.

**Step 2: Add redirect guard on new event page**

If the new event page exists, add at the top:

```tsx
const session = await getSession();
if (!session) redirect("/auth/signin");
if (session.role === "partner") redirect("/events");
```

**Step 3: Commit**

```bash
git add src/app/(authenticated)/events/new/page.tsx
git commit -m "fix: redirect partner from event creation page"
```

---

## Task 5: Extract STATUS_COLORS to shared constant

Carried over from Phase 2 code review. STATUS_COLORS is duplicated in event detail page and potentially the events list.

**Files:**
- Create: `src/lib/constants.ts`
- Modify: `src/app/(authenticated)/events/[id]/page.tsx`
- Modify: any other files using STATUS_COLORS (check with grep)

**Step 1: Create shared constants file**

```typescript
export const STATUS_COLORS: Record<string, string> = {
  enquiry: "bg-grey/20 text-grey",
  confirmed: "bg-cognac/20 text-cognac",
  preparation: "bg-gold/20 text-gold",
  ready: "bg-botanical/20 text-botanical",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-error/10 text-error/60",
};

export const STATUS_ORDER = [
  "enquiry",
  "confirmed",
  "preparation",
  "ready",
  "delivered",
] as const;
```

**Step 2: Update imports**

Replace local definitions in event detail page (and any other files) with:

```typescript
import { STATUS_COLORS, STATUS_ORDER } from "@/lib/constants";
```

**Step 3: Run build to verify**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/lib/constants.ts src/app/(authenticated)/events/[id]/page.tsx
git commit -m "refactor: extract STATUS_COLORS and STATUS_ORDER to shared constants"
```

---

## Task 6: Optimise dashboard N+1 checklist query

The dashboard currently loops through urgent events and fires a separate DB query per event for checklist items. Replace with a single batch query.

**Files:**
- Modify: `src/actions/dashboard.ts`

**Step 1: Replace the N+1 loop**

Replace lines 163-191 (the `urgentEvents` loop) with a single query:

```typescript
// Batch: get all incomplete checklist items for urgent events in one query
const urgentEventIds = urgentEvents.map((e) => e.id);

if (urgentEventIds.length > 0) {
  const incompleteItems = await db
    .select({
      eventId: eventChecklists.eventId,
    })
    .from(eventChecklists)
    .where(
      and(
        inArray(eventChecklists.eventId, urgentEventIds),
        eq(eventChecklists.isCompleted, false)
      )
    );

  // Count incomplete items per event
  const countByEvent = new Map<string, number>();
  for (const item of incompleteItems) {
    countByEvent.set(item.eventId, (countByEvent.get(item.eventId) || 0) + 1);
  }

  for (const [eventId, count] of countByEvent) {
    const event = urgentEvents.find((e) => e.id === eventId);
    if (event) {
      actions.push({
        eventId: event.id,
        eventName: event.eventName,
        issue: `${count} incomplete checklist item${count === 1 ? "" : "s"}`,
      });
    }
  }
}
```

Add `inArray` to the drizzle-orm import:

```typescript
import { eq, and, ne, inArray } from "drizzle-orm";
```

**Step 2: Verify dashboard still renders correctly**

Navigate to dashboard — should still show the same action items.

**Step 3: Commit**

```bash
git add src/actions/dashboard.ts
git commit -m "perf: batch checklist query in dashboard, eliminate N+1"
```

---

## Task 7: 48-hour alert email notifications

When an event is within 48 hours and has incomplete checklist items, send an email alert to Murdo. This runs as a check on dashboard load (simple approach for 3 users — no cron needed).

**Files:**
- Create: `src/actions/alerts.ts`
- Create: `src/lib/alert-email.test.ts`
- Modify: `src/actions/dashboard.ts` (call alert check)

**Step 1: Write the failing test**

```typescript
// src/lib/alert-email.test.ts
import { describe, it, expect } from "vitest";
import { shouldSendAlert } from "@/lib/alert-logic";

describe("shouldSendAlert", () => {
  it("returns true when event is within 48 hours and has incomplete items", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = shouldSendAlert({
      eventDate: tomorrow.toISOString().split("T")[0],
      incompleteCount: 3,
      lastAlertSentAt: null,
    });
    expect(result).toBe(true);
  });

  it("returns false when alert was sent within last 24 hours", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = shouldSendAlert({
      eventDate: tomorrow.toISOString().split("T")[0],
      incompleteCount: 3,
      lastAlertSentAt: new Date(), // just sent
    });
    expect(result).toBe(false);
  });

  it("returns false when no incomplete items", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = shouldSendAlert({
      eventDate: tomorrow.toISOString().split("T")[0],
      incompleteCount: 0,
      lastAlertSentAt: null,
    });
    expect(result).toBe(false);
  });

  it("returns false when event is more than 48 hours away", () => {
    const inFiveDays = new Date();
    inFiveDays.setDate(inFiveDays.getDate() + 5);
    const result = shouldSendAlert({
      eventDate: inFiveDays.toISOString().split("T")[0],
      incompleteCount: 3,
      lastAlertSentAt: null,
    });
    expect(result).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- --run src/lib/alert-email.test.ts
```

Expected: FAIL — `shouldSendAlert` doesn't exist.

**Step 3: Implement alert logic**

Create `src/lib/alert-logic.ts`:

```typescript
interface AlertInput {
  eventDate: string;
  incompleteCount: number;
  lastAlertSentAt: Date | null;
}

export function shouldSendAlert(input: AlertInput): boolean {
  if (input.incompleteCount === 0) return false;

  const now = new Date();
  const eventDate = new Date(input.eventDate + "T00:00:00");
  const hoursUntil =
    (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil > 48 || hoursUntil < 0) return false;

  // Don't re-send within 24 hours
  if (input.lastAlertSentAt) {
    const hoursSinceLastAlert =
      (now.getTime() - input.lastAlertSentAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastAlert < 24) return false;
  }

  return true;
}
```

**Step 4: Run tests**

```bash
npm run test -- --run src/lib/alert-email.test.ts
```

Expected: PASS

**Step 5: Add `lastAlertSentAt` column to events table**

In `src/db/schema.ts`, add to the events table:

```typescript
lastAlertSentAt: timestamp("last_alert_sent_at"),
```

Then push schema:

```bash
npx drizzle-kit push
```

**Step 6: Create the alert action**

Create `src/actions/alerts.ts`:

```typescript
"use server";

import { db } from "@/db";
import { events, eventChecklists } from "@/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import { shouldSendAlert } from "@/lib/alert-logic";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function checkAndSendAlerts() {
  const now = new Date();
  const todayStr = toDateString(now);
  const in48Hours = new Date(now);
  in48Hours.setDate(in48Hours.getDate() + 2);
  const in48HoursStr = toDateString(in48Hours);

  // Get events within 48 hours
  const urgentEvents = await db
    .select()
    .from(events)
    .where(ne(events.status, "cancelled"));

  const within48 = urgentEvents.filter(
    (e) => e.eventDate >= todayStr && e.eventDate <= in48HoursStr
  );

  if (within48.length === 0) return;

  const eventIds = within48.map((e) => e.id);
  const incompleteItems = await db
    .select({ eventId: eventChecklists.eventId })
    .from(eventChecklists)
    .where(
      and(
        inArray(eventChecklists.eventId, eventIds),
        eq(eventChecklists.isCompleted, false)
      )
    );

  const countByEvent = new Map<string, number>();
  for (const item of incompleteItems) {
    countByEvent.set(item.eventId, (countByEvent.get(item.eventId) || 0) + 1);
  }

  for (const event of within48) {
    const incompleteCount = countByEvent.get(event.id) || 0;

    if (
      shouldSendAlert({
        eventDate: event.eventDate,
        incompleteCount,
        lastAlertSentAt: event.lastAlertSentAt,
      })
    ) {
      try {
        await resend.emails.send({
          from: process.env.FROM_EMAIL || "onboarding@resend.dev",
          to: "murdo@bar-excellence.app",
          subject: `⚠ ${event.eventName} — ${incompleteCount} checklist items incomplete`,
          text: `${event.eventName} on ${event.eventDate} has ${incompleteCount} incomplete checklist items. Review at backstage.bar-excellence.app/events/${event.id}`,
        });

        await db
          .update(events)
          .set({ lastAlertSentAt: new Date() })
          .where(eq(events.id, event.id));
      } catch (err) {
        console.error(`Alert email failed for ${event.eventName}:`, err);
      }
    }
  }
}
```

**Step 7: Wire into dashboard load**

At the end of `getDashboardData()` in `src/actions/dashboard.ts`, before the return:

```typescript
// Fire-and-forget: check for 48-hour alerts
checkAndSendAlerts().catch(console.error);
```

Import at top:

```typescript
import { checkAndSendAlerts } from "./alerts";
```

**Step 8: Commit**

```bash
git add src/lib/alert-logic.ts src/lib/alert-email.test.ts src/actions/alerts.ts src/actions/dashboard.ts src/db/schema.ts
git commit -m "feat: 48-hour alert emails for incomplete checklists"
```

---

## Task 8: Run build and full test suite

**Step 1: Run tests**

```bash
npm run test -- --run
```

All tests must pass.

**Step 2: Run build**

```bash
npm run build
```

Must complete without errors.

**Step 3: Manual QA walkthrough**

1. Log in as Murdo (owner) — dashboard renders, events list + kanban work, event detail has all tabs and actions
2. Log in as Rory (partner) — redirected from dashboard to events, events list shows confirmed+ only, event detail has Overview/Cocktails/Stock tabs only, no action buttons
3. Verify partner cannot access `/events/new` (redirect)
4. Verify partner empty state text renders when no confirmed events exist

**Step 4: Commit any fixes**

```bash
git commit -m "fix: address QA findings from Phase 3 walkthrough"
```

---

## Summary

| Task | What | Priority |
|------|------|----------|
| 1 | Dashboard redirect for partner | Critical |
| 2 | Event detail: hide tabs/buttons for partner | Critical |
| 3 | Partner empty state on events page | High |
| 4 | Guard event creation route for partner | High |
| 5 | Extract STATUS_COLORS to shared constants | Medium (cleanup) |
| 6 | Optimise dashboard N+1 checklist query | Medium (perf) |
| 7 | 48-hour alert email notifications | Medium (feature) |
| 8 | Build + full test suite + QA | Critical |

## Deferred to Phase 3b

These items from the design doc are lower priority and can follow in a second pass:

- **Equipment templates** — new schema (equipment_templates, equipment_template_items, event_equipment), scaling rules, UI in event detail. Significant scope.
- **Standard notes bank** — new schema, tick-on/tick-off per event UI.
- **Quick Capture FAB** — mobile-only, requires responsive sidebar first (Phase 1 TODO).
- **Responsive sidebar + mobile top bar** — Phase 1 TODO, prerequisite for Quick Capture.
