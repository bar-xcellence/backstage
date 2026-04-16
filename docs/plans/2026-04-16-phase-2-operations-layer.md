# Phase 2: Operations Layer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the dashboard, pipeline kanban, event checklists, and brief preview slide-over to Backstage — turning it from a data entry tool into an operational command centre for Murdo.

**Architecture:** Phase 2 adds one new DB table (`event_checklists`), a server action layer for checklists and dashboard metrics, and four major UI features: dashboard page, kanban view toggle on Events, checklist tab on Event detail, and a brief preview slide-over on Send to LC. All follow the existing Reserve Noir design system. Empty states are first-class features — every zero-data state has warm copy and a clear CTA.

**Tech Stack:** Next.js 16.2 App Router, Drizzle ORM, NeonDB, Tailwind v4, @hello-pangea/dnd (kanban drag-and-drop), @tanstack/react-table (event list DataTable), Vitest for unit tests.

**Existing patterns to reuse:**
- `requireRole()` in `src/lib/session.ts` for all server actions
- `revalidatePath()` after mutations
- `font-[family-name:var(--font-cormorant)]` for headings, `font-[family-name:var(--font-raleway)]` for body
- Utility label: `text-[11px] font-medium tracking-[0.16em] uppercase`
- Form field pattern from `src/components/events/event-form.tsx`
- Status colour map from `src/app/(authenticated)/events/page.tsx`

**Empty state philosophy:** If a section has zero items, show warm Cormorant Garamond heading + Raleway body text + gold CTA where applicable. Never show "No items found." Never show an empty container. Hide sections entirely when "nothing to show" is the correct semantic (e.g., dashboard action list when nothing is overdue).

---

## Task 1: Add `event_checklists` table and migration

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/db/checklist-templates.ts`
- Test: `src/db/schema.test.ts` (add checklist assertions)

**Step 1: Add the checklist table to schema.ts**

Add after the `eventCocktails` table definition (~line 259):

```typescript
// ── Event Checklists ──────────────────────────────────

export const eventChecklists = pgTable("event_checklists", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  label: text("label").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  isCustom: boolean("is_custom").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Step 2: Add relations**

Add to the relations section:

```typescript
export const eventChecklistsRelations = relations(
  eventChecklists,
  ({ one }) => ({
    event: one(events, {
      fields: [eventChecklists.eventId],
      references: [events.id],
    }),
  })
);
```

Update `eventsRelations` to add:
```typescript
checklists: many(eventChecklists),
```

**Step 3: Create checklist template definitions**

Create `src/db/checklist-templates.ts`:

```typescript
export interface ChecklistTemplate {
  label: string;
  sortOrder: number;
}

const BASE_ITEMS: ChecklistTemplate[] = [
  { label: "Contact details confirmed", sortOrder: 0 },
  { label: "Brief sent to LC", sortOrder: 1 },
  { label: "Stock ordered", sortOrder: 2 },
  { label: "Reference images uploaded", sortOrder: 3 },
  { label: "Batching instructions written", sortOrder: 4 },
  { label: "Parking confirmed", sortOrder: 5 },
  { label: "Equipment packed", sortOrder: 6 },
  { label: "Attire communicated", sortOrder: 7 },
];

const EXHIBITION_EXTRAS: ChecklistTemplate[] = [
  { label: "Banner stand packed", sortOrder: 8 },
  { label: "Table cover packed", sortOrder: 9 },
  { label: "Extension leads packed", sortOrder: 10 },
  { label: "Signage prepared", sortOrder: 11 },
];

export function getTemplateItems(
  eventType: string
): ChecklistTemplate[] {
  if (eventType === "exhibition") {
    return [...BASE_ITEMS, ...EXHIBITION_EXTRAS];
  }
  return [...BASE_ITEMS];
}
```

**Step 4: Write schema test**

Add to `src/db/schema.test.ts`:

```typescript
it("exports eventChecklists table", () => {
  expect(eventChecklists).toBeDefined();
  expect(eventChecklists.id).toBeDefined();
  expect(eventChecklists.eventId).toBeDefined();
  expect(eventChecklists.label).toBeDefined();
  expect(eventChecklists.isCompleted).toBeDefined();
  expect(eventChecklists.isCustom).toBeDefined();
});
```

**Step 5: Run tests**

```bash
npm run test -- --run
```

Expected: All existing + new tests pass.

**Step 6: Generate and run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

**Step 7: Commit**

```bash
git add src/db/schema.ts src/db/checklist-templates.ts src/db/schema.test.ts drizzle/
git commit -m "feat: add event_checklists table with predefined templates"
```

---

## Task 2: Checklist server actions

**Files:**
- Create: `src/actions/checklists.ts`
- Test: `src/lib/checklist-templates.test.ts`

**Step 1: Write the template test**

Create `src/lib/checklist-templates.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getTemplateItems } from "@/db/checklist-templates";

describe("Checklist Templates", () => {
  it("returns 8 base items for corporate events", () => {
    const items = getTemplateItems("corporate");
    expect(items).toHaveLength(8);
    expect(items[0].label).toBe("Contact details confirmed");
    expect(items[7].label).toBe("Attire communicated");
  });

  it("returns 12 items for exhibition events (8 base + 4 extra)", () => {
    const items = getTemplateItems("exhibition");
    expect(items).toHaveLength(12);
    expect(items[8].label).toBe("Banner stand packed");
    expect(items[11].label).toBe("Signage prepared");
  });

  it("returns items in sorted order", () => {
    const items = getTemplateItems("exhibition");
    for (let i = 1; i < items.length; i++) {
      expect(items[i].sortOrder).toBeGreaterThan(items[i - 1].sortOrder);
    }
  });
});
```

**Step 2: Run tests to verify they pass**

```bash
npm run test -- --run
```

**Step 3: Create checklist server actions**

Create `src/actions/checklists.ts`:

```typescript
"use server";

import { db } from "@/db";
import { eventChecklists, events } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { getTemplateItems } from "@/db/checklist-templates";
import { revalidatePath } from "next/cache";

export async function getEventChecklist(eventId: string) {
  await requireRole("owner", "super_admin");
  return db
    .select()
    .from(eventChecklists)
    .where(eq(eventChecklists.eventId, eventId))
    .orderBy(asc(eventChecklists.sortOrder));
}

export async function generateChecklist(eventId: string) {
  await requireRole("owner", "super_admin");

  // Don't regenerate if items already exist
  const existing = await db
    .select({ id: eventChecklists.id })
    .from(eventChecklists)
    .where(eq(eventChecklists.eventId, eventId))
    .limit(1);

  if (existing.length > 0) return;

  // Get event type to determine template
  const [event] = await db
    .select({ eventType: events.eventType })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) return;

  const items = getTemplateItems(event.eventType || "corporate");

  await db.insert(eventChecklists).values(
    items.map((item) => ({
      eventId,
      label: item.label,
      isCompleted: false,
      isCustom: false,
      sortOrder: item.sortOrder,
    }))
  );

  revalidatePath(`/events/${eventId}`);
}

export async function toggleChecklistItem(
  itemId: string,
  eventId: string
) {
  await requireRole("owner", "super_admin");

  const [item] = await db
    .select()
    .from(eventChecklists)
    .where(eq(eventChecklists.id, itemId))
    .limit(1);

  if (!item) return;

  await db
    .update(eventChecklists)
    .set({
      isCompleted: !item.isCompleted,
      completedAt: !item.isCompleted ? new Date() : null,
    })
    .where(eq(eventChecklists.id, itemId));

  revalidatePath(`/events/${eventId}`);
}

export async function addCustomChecklistItem(
  eventId: string,
  label: string
) {
  await requireRole("owner", "super_admin");

  if (!label.trim()) return;

  // Get the highest sort order
  const existing = await db
    .select({ sortOrder: eventChecklists.sortOrder })
    .from(eventChecklists)
    .where(eq(eventChecklists.eventId, eventId))
    .orderBy(asc(eventChecklists.sortOrder));

  const nextOrder =
    existing.length > 0
      ? existing[existing.length - 1].sortOrder + 1
      : 0;

  await db.insert(eventChecklists).values({
    eventId,
    label: label.trim(),
    isCompleted: false,
    isCustom: true,
    sortOrder: nextOrder,
  });

  revalidatePath(`/events/${eventId}`);
}

export async function removeCustomChecklistItem(
  itemId: string,
  eventId: string
) {
  await requireRole("owner", "super_admin");

  // Only allow removing custom items
  const [item] = await db
    .select()
    .from(eventChecklists)
    .where(eq(eventChecklists.id, itemId))
    .limit(1);

  if (!item || !item.isCustom) return;

  await db
    .delete(eventChecklists)
    .where(eq(eventChecklists.id, itemId));

  revalidatePath(`/events/${eventId}`);
}
```

**Step 4: Commit**

```bash
git add src/actions/checklists.ts src/lib/checklist-templates.test.ts
git commit -m "feat: checklist server actions with template generation"
```

---

## Task 3: Auto-generate checklist on status advance to "confirmed"

**Files:**
- Modify: `src/actions/events.ts` (the `updateEventStatus` function)

**Step 1: Import and call generateChecklist**

In `src/actions/events.ts`, add at the top:

```typescript
import { generateChecklist } from "./checklists";
```

In `updateEventStatus`, after the `db.update` call, add:

```typescript
// Auto-generate checklist when event moves to confirmed
if (status === "confirmed") {
  await generateChecklist(id);
}
```

**Step 2: Commit**

```bash
git add src/actions/events.ts
git commit -m "feat: auto-generate checklist when event confirmed"
```

---

## Task 4: Checklist UI component

**Files:**
- Create: `src/components/events/event-checklist.tsx`

**Step 1: Build the component**

```typescript
"use client";

import { useState } from "react";
import {
  toggleChecklistItem,
  addCustomChecklistItem,
  removeCustomChecklistItem,
} from "@/actions/checklists";

interface ChecklistItem {
  id: string;
  label: string;
  isCompleted: boolean;
  isCustom: boolean;
  completedAt: Date | null;
}

export function EventChecklist({
  eventId,
  items,
  eventStatus,
}: {
  eventId: string;
  items: ChecklistItem[];
  eventStatus: string;
}) {
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);

  // Empty state: event not yet confirmed
  if (items.length === 0 && eventStatus === "enquiry") {
    return (
      <div className="py-12 text-center">
        <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-2">
          Awaiting Confirmation
        </h3>
        <p className="font-[family-name:var(--font-raleway)] text-sm text-grey leading-relaxed max-w-md mx-auto">
          The checklist is generated when this event moves to Confirmed.
          Advance the status to get started.
        </p>
      </div>
    );
  }

  // Empty state: confirmed but no items (shouldn't happen, but safety net)
  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
          No checklist items yet.
        </p>
      </div>
    );
  }

  const completedCount = items.filter((i) => i.isCompleted).length;
  const allDone = completedCount === items.length;

  async function handleToggle(itemId: string) {
    await toggleChecklistItem(itemId, eventId);
  }

  async function handleAddItem() {
    if (!newItem.trim()) return;
    setAdding(true);
    await addCustomChecklistItem(eventId, newItem);
    setNewItem("");
    setAdding(false);
  }

  async function handleRemove(itemId: string) {
    await removeCustomChecklistItem(itemId, eventId);
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <p className="font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey">
          {completedCount} of {items.length} complete
        </p>
        {allDone && (
          <p className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-botanical">
            All items complete. This event is ready.
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-surface-low mb-6">
        <div
          className="h-1 bg-botanical transition-all duration-500"
          style={{
            width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-3 border-b border-outline/10 group"
          >
            <button
              onClick={() => handleToggle(item.id)}
              className="flex items-center gap-3 flex-1 text-left cursor-pointer"
            >
              {/* Checkbox */}
              <span
                className={`w-5 h-5 border-2 flex items-center justify-center shrink-0 transition-colors duration-200 ${
                  item.isCompleted
                    ? "bg-botanical border-botanical"
                    : "border-outline/30 hover:border-gold"
                }`}
              >
                {item.isCompleted && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="text-cream"
                  >
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="square"
                    />
                  </svg>
                )}
              </span>

              {/* Label */}
              <span
                className={`font-[family-name:var(--font-raleway)] text-sm transition-all duration-300 ${
                  item.isCompleted
                    ? "text-grey line-through"
                    : "text-charcoal"
                }`}
              >
                {item.label}
              </span>
            </button>

            {/* Remove button for custom items */}
            {item.isCustom && (
              <button
                onClick={() => handleRemove(item.id)}
                className="opacity-0 group-hover:opacity-100 text-grey hover:text-error text-[10px] font-medium tracking-[0.16em] uppercase transition-all duration-200 cursor-pointer ml-2"
              >
                REMOVE
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add custom item */}
      <div className="flex items-center gap-3 mt-4 pt-4">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddItem();
          }}
          placeholder="Add a custom item..."
          className="flex-1 px-3 py-2.5 bg-surface-low border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:border-gold focus:outline-none transition-colors duration-200 placeholder:text-grey/40 min-h-[44px]"
        />
        <button
          onClick={handleAddItem}
          disabled={!newItem.trim() || adding}
          className="px-5 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-30 min-h-[44px] cursor-pointer"
        >
          ADD
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/events/event-checklist.tsx
git commit -m "feat: checklist UI component with optimistic toggle and custom items"
```

---

## Task 5: Wire checklist into event detail page

**Files:**
- Modify: `src/app/(authenticated)/events/[id]/page.tsx`

**Step 1: Import and fetch checklist data**

Add imports:

```typescript
import { getEventChecklist } from "@/actions/checklists";
import { EventChecklist } from "@/components/events/event-checklist";
```

After the `availableCocktails` fetch, add:

```typescript
const checklist = await getEventChecklist(id);
```

**Step 2: Add checklist tab**

Update the `tabs` array:

```typescript
const tabs = [
  { id: "overview", label: "Overview" },
  { id: "cocktails", label: `Cocktails (${eventCocktails.length})` },
  { id: "stock", label: "Stock List" },
  { id: "checklist", label: `Checklist (${checklist.filter(c => c.isCompleted).length}/${checklist.length})` },
  { id: "edit", label: "Edit" },
];
```

Add the checklist panel inside the `EventTabs` children:

```typescript
checklist: (
  <EventChecklist
    eventId={id}
    items={checklist}
    eventStatus={event.status}
  />
),
```

**Step 3: Run dev server and test**

```bash
npm run dev
```

Verify:
- New "Checklist (0/0)" tab appears on event detail
- Enquiry events show "Awaiting Confirmation" empty state
- Advancing to "confirmed" generates 8 items (or 12 for exhibition)
- Toggling items works with strike-through animation
- Custom items can be added and removed

**Step 4: Commit**

```bash
git add src/app/\(authenticated\)/events/\[id\]/page.tsx
git commit -m "feat: wire checklist tab into event detail page"
```

---

## Task 6: Install @hello-pangea/dnd and @tanstack/react-table

**Files:**
- Modify: `package.json`

**Step 1: Install dependencies**

```bash
npm install @hello-pangea/dnd @tanstack/react-table
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @hello-pangea/dnd and @tanstack/react-table"
```

---

## Task 7: Events page with list/kanban view toggle

**Files:**
- Create: `src/components/events/view-toggle.tsx`
- Create: `src/components/events/event-kanban.tsx`
- Create: `src/components/events/event-data-table.tsx`
- Modify: `src/app/(authenticated)/events/page.tsx`

**Step 1: Create the view toggle component**

Create `src/components/events/view-toggle.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";

type ViewMode = "list" | "kanban";

export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>("list");

  useEffect(() => {
    const stored = localStorage.getItem("backstage-events-view");
    if (stored === "kanban" || stored === "list") {
      setMode(stored);
    }
  }, []);

  function setViewMode(newMode: ViewMode) {
    setMode(newMode);
    localStorage.setItem("backstage-events-view", newMode);
  }

  return [mode, setViewMode];
}

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex">
      <button
        onClick={() => onChange("list")}
        className={`px-4 py-2 font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 min-h-[36px] cursor-pointer ${
          mode === "list"
            ? "bg-gold text-cream"
            : "bg-surface-low text-grey hover:text-charcoal"
        }`}
      >
        LIST
      </button>
      <button
        onClick={() => onChange("kanban")}
        className={`px-4 py-2 font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 min-h-[36px] cursor-pointer ${
          mode === "kanban"
            ? "bg-gold text-cream"
            : "bg-surface-low text-grey hover:text-charcoal"
        }`}
      >
        KANBAN
      </button>
    </div>
  );
}
```

**Step 2: Create the kanban component**

Create `src/components/events/event-kanban.tsx`:

```typescript
"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import Link from "next/link";
import { updateEventStatus } from "@/actions/events";

interface KanbanEvent {
  id: string;
  eventName: string;
  eventDate: string;
  venueName: string;
  guestCount: number;
  status: string;
  lcSentAt: Date | null;
}

const COLUMNS = [
  { id: "enquiry", label: "ENQUIRY" },
  { id: "confirmed", label: "CONFIRMED" },
  { id: "preparation", label: "PREPARATION" },
  { id: "ready", label: "READY" },
  { id: "delivered", label: "DELIVERED" },
];

const STATUS_ACCENT: Record<string, string> = {
  enquiry: "border-l-grey",
  confirmed: "border-l-cognac",
  preparation: "border-l-gold",
  ready: "border-l-botanical",
  delivered: "border-l-success",
};

export function EventKanban({ events }: { events: KanbanEvent[] }) {
  const grouped: Record<string, KanbanEvent[]> = {};
  for (const col of COLUMNS) {
    grouped[col.id] = events.filter((e) => e.status === col.id);
  }

  async function handleDragEnd(result: DropResult) {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    const event = events.find((e) => e.id === draggableId);
    if (!event || event.status === newStatus) return;
    await updateEventStatus(draggableId, newStatus);
  }

  // Empty state: no events at all
  if (events.length === 0) {
    return null; // Falls through to the events page empty state
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <Droppable key={col.id} droppableId={col.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-w-[240px] w-[240px] shrink-0 ${
                  snapshot.isDraggingOver
                    ? "bg-gold/5"
                    : "bg-surface-low/50"
                } transition-colors duration-200`}
              >
                {/* Column header */}
                <div className="px-3 py-3 mb-2">
                  <span className="font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey">
                    {col.label}
                  </span>
                  <span className="ml-2 font-[family-name:var(--font-raleway)] text-[11px] text-grey/50">
                    {grouped[col.id].length}
                  </span>
                </div>

                {/* Cards */}
                <div className="px-2 space-y-2 min-h-[100px]">
                  {grouped[col.id].map((event, index) => (
                    <Draggable
                      key={event.id}
                      draggableId={event.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-cream p-3 border-l-2 ${STATUS_ACCENT[event.status] || "border-l-grey"} transition-shadow duration-200 ${
                            snapshot.isDragging
                              ? "shadow-[0px_20px_40px_rgba(30,31,46,0.12)] opacity-90"
                              : ""
                          }`}
                        >
                          <Link
                            href={`/events/${event.id}`}
                            className="block"
                          >
                            <p className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-charcoal truncate">
                              {event.eventName}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 font-[family-name:var(--font-raleway)] text-[10px] tracking-[0.16em] uppercase text-grey">
                              <span>{event.eventDate}</span>
                              <span>{event.guestCount}pp</span>
                            </div>
                            {event.lcSentAt && (
                              <span className="inline-block mt-1.5 text-[10px] font-medium tracking-[0.16em] uppercase text-success">
                                SENT TO LC
                              </span>
                            )}
                          </Link>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
```

**Step 3: Create the DataTable component**

Create `src/components/events/event-data-table.tsx`:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";

interface TableEvent {
  id: string;
  eventName: string;
  showName: string | null;
  eventDate: string;
  venueName: string;
  guestCount: number;
  status: string;
  lcSentAt: Date | null;
}

const STATUS_COLORS: Record<string, string> = {
  enquiry: "bg-grey/20 text-grey",
  confirmed: "bg-cognac/20 text-cognac",
  preparation: "bg-gold/20 text-gold",
  ready: "bg-botanical/20 text-botanical",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-error/10 text-error/60",
};

const columnHelper = createColumnHelper<TableEvent>();

const columns = [
  columnHelper.accessor("eventName", {
    header: "Event",
    cell: (info) => (
      <Link
        href={`/events/${info.row.original.id}`}
        className="font-semibold text-charcoal hover:text-gold transition-colors duration-200"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("eventDate", {
    header: "Date",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("venueName", {
    header: "Venue",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("guestCount", {
    header: "Guests",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => (
      <span
        className={`px-2 py-0.5 text-[10px] font-medium tracking-[0.16em] uppercase ${STATUS_COLORS[info.getValue()] || STATUS_COLORS.enquiry}`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("lcSentAt", {
    header: "Brief",
    cell: (info) =>
      info.getValue() ? (
        <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-success">
          SENT
        </span>
      ) : (
        <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-grey/40">
          —
        </span>
      ),
  }),
];

export function EventDataTable({ events }: { events: TableEvent[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "eventDate", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data: events,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder="Search events..."
        className="w-full max-w-sm mb-4 px-3 py-2.5 bg-surface-low border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:border-gold focus:outline-none transition-colors duration-200 placeholder:text-grey/40 min-h-[44px]"
      />

      {/* Table */}
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="text-left px-3 py-3 font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey border-b border-outline/15 cursor-pointer hover:text-charcoal transition-colors duration-200"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                  {header.column.getIsSorted() === "asc" && " ↑"}
                  {header.column.getIsSorted() === "desc" && " ↓"}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-outline/10 hover:bg-surface-low/50 transition-colors duration-200"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-3 py-3 font-[family-name:var(--font-raleway)] text-sm text-gold-ink"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty search result */}
      {table.getRowModel().rows.length === 0 && globalFilter && (
        <div className="py-12 text-center">
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
            No events match "{globalFilter}"
          </p>
          <button
            onClick={() => setGlobalFilter("")}
            className="mt-2 text-gold text-[11px] font-semibold tracking-[0.16em] uppercase hover:text-gold-ink transition-colors duration-200 cursor-pointer"
          >
            CLEAR SEARCH
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 4: Rewrite the events page with view toggle**

Rewrite `src/app/(authenticated)/events/page.tsx` — this becomes a thin Server Component that passes data to the Client Component wrapper:

Create `src/components/events/events-view.tsx`:

```typescript
"use client";

import Link from "next/link";
import { ViewToggle, useViewMode } from "./view-toggle";
import { EventKanban } from "./event-kanban";
import { EventDataTable } from "./event-data-table";

interface EventRow {
  id: string;
  eventName: string;
  showName: string | null;
  eventDate: string;
  venueName: string;
  guestCount: number;
  status: string;
  lcSentAt: Date | null;
}

export function EventsView({ events }: { events: EventRow[] }) {
  const [viewMode, setViewMode] = useViewMode();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
          Events
        </h1>
        <div className="flex items-center gap-4">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <Link
            href="/events/new"
            className="px-6 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 min-h-[44px] flex items-center"
          >
            ADD EVENT
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {events.length === 0 ? (
        <div className="py-16 text-center">
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-charcoal tracking-tight mb-2">
            No events yet
          </h2>
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mb-4">
            Create your first event to get started with Backstage.
          </p>
          <Link
            href="/events/new"
            className="inline-block text-gold text-[11px] font-semibold tracking-[0.16em] uppercase hover:text-gold-ink transition-colors duration-200"
          >
            CREATE YOUR FIRST EVENT
          </Link>
        </div>
      ) : viewMode === "kanban" ? (
        <EventKanban events={events} />
      ) : (
        <EventDataTable events={events} />
      )}
    </div>
  );
}
```

Update `src/app/(authenticated)/events/page.tsx`:

```typescript
import { listEvents } from "@/actions/events";
import { EventsView } from "@/components/events/events-view";

export default async function EventsPage() {
  const events = await listEvents();
  return <EventsView events={events} />;
}
```

**Step 5: Run dev server and test**

```bash
npm run dev
```

Verify:
- LIST/KANBAN toggle appears in header
- Toggle state persists on page reload (localStorage)
- List view shows sortable DataTable with search
- Kanban shows 5 columns with cards
- Dragging a card to a new column updates status
- Empty state shows warm message with CTA
- Searching with no results shows "No events match" with clear button

**Step 6: Commit**

```bash
git add src/components/events/view-toggle.tsx src/components/events/event-kanban.tsx src/components/events/event-data-table.tsx src/components/events/events-view.tsx src/app/\(authenticated\)/events/page.tsx
git commit -m "feat: events page with list/kanban toggle, DataTable, and drag-and-drop"
```

---

## Task 8: Dashboard page — server action for metrics

**Files:**
- Create: `src/actions/dashboard.ts`

**Step 1: Create dashboard data fetcher**

```typescript
"use server";

import { db } from "@/db";
import { events, eventChecklists } from "@/db/schema";
import { eq, and, gte, lte, sql, desc, ne } from "drizzle-orm";
import { requireRole } from "@/lib/session";

export interface DashboardData {
  userName: string;
  // Next event
  nextEvent: {
    id: string;
    eventName: string;
    eventDate: string;
    daysUntil: number;
  } | null;
  // Metrics
  eventsThisWeek: number;
  overdueItems: number;
  revenueThisMonth: number;
  // Action items
  actions: Array<{
    eventId: string;
    eventName: string;
    issue: string;
  }>;
  // Upcoming events (next 14 days)
  upcoming: Array<{
    id: string;
    eventName: string;
    eventDate: string;
    venueName: string;
    status: string;
    guestCount: number;
  }>;
}

export async function getDashboardData(): Promise<DashboardData> {
  const session = await requireRole("owner", "super_admin");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Get start of this week (Monday)
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const sundayEnd = new Date(weekStart);
  sundayEnd.setDate(weekStart.getDate() + 6);
  const weekEndStr = sundayEnd.toISOString().split("T")[0];

  // 14 days from now
  const twoWeeks = new Date(today);
  twoWeeks.setDate(today.getDate() + 14);
  const twoWeeksStr = twoWeeks.toISOString().split("T")[0];

  // Start of month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split("T")[0];
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthEndStr = monthEnd.toISOString().split("T")[0];

  // Fetch all non-cancelled events
  const allEvents = await db
    .select()
    .from(events)
    .where(ne(events.status, "cancelled"))
    .orderBy(events.eventDate);

  // Events this week
  const eventsThisWeek = allEvents.filter(
    (e) => e.eventDate >= weekStartStr && e.eventDate <= weekEndStr
  ).length;

  // Revenue this month (sum of invoiceAmount for delivered events)
  const revenueThisMonth = allEvents
    .filter(
      (e) =>
        e.eventDate >= monthStartStr &&
        e.eventDate <= monthEndStr &&
        e.invoiceAmount
    )
    .reduce((sum, e) => sum + Number(e.invoiceAmount || 0), 0);

  // Next upcoming event
  const futureEvents = allEvents.filter((e) => e.eventDate >= todayStr);
  const nextEvent = futureEvents[0]
    ? {
        id: futureEvents[0].id,
        eventName: futureEvents[0].eventName,
        eventDate: futureEvents[0].eventDate,
        daysUntil: Math.ceil(
          (new Date(futureEvents[0].eventDate).getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      }
    : null;

  // Upcoming events (next 14 days)
  const upcoming = allEvents
    .filter((e) => e.eventDate >= todayStr && e.eventDate <= twoWeeksStr)
    .map((e) => ({
      id: e.id,
      eventName: e.eventName,
      eventDate: e.eventDate,
      venueName: e.venueName,
      status: e.status,
      guestCount: e.guestCount,
    }));

  // Action items: events that need attention
  const actions: DashboardData["actions"] = [];

  for (const event of futureEvents) {
    // Confirmed+ events that haven't sent brief
    if (
      ["confirmed", "preparation", "ready"].includes(event.status) &&
      !event.lcSentAt
    ) {
      actions.push({
        eventId: event.id,
        eventName: event.eventName,
        issue: "Brief not sent to LC",
      });
    }
  }

  // Incomplete checklist items for events within 48 hours
  const twoDaysOut = new Date(today);
  twoDaysOut.setDate(today.getDate() + 2);
  const twoDaysStr = twoDaysOut.toISOString().split("T")[0];

  const urgentEvents = allEvents.filter(
    (e) =>
      e.eventDate >= todayStr &&
      e.eventDate <= twoDaysStr &&
      e.status !== "delivered"
  );

  for (const event of urgentEvents) {
    const incomplete = await db
      .select({ id: eventChecklists.id })
      .from(eventChecklists)
      .where(
        and(
          eq(eventChecklists.eventId, event.id),
          eq(eventChecklists.isCompleted, false)
        )
      )
      .limit(1);

    if (incomplete.length > 0) {
      actions.push({
        eventId: event.id,
        eventName: event.eventName,
        issue: "Checklist incomplete — event within 48 hours",
      });
    }
  }

  // Overdue = events in the past that are not "delivered" or "cancelled"
  const overdueItems = allEvents.filter(
    (e) =>
      e.eventDate < todayStr &&
      !["delivered", "cancelled"].includes(e.status)
  ).length;

  return {
    userName: session.name,
    nextEvent,
    eventsThisWeek,
    overdueItems,
    revenueThisMonth,
    actions,
    upcoming,
  };
}
```

**Step 2: Commit**

```bash
git add src/actions/dashboard.ts
git commit -m "feat: dashboard data fetcher with metrics, actions, and upcoming events"
```

---

## Task 9: Dashboard page UI

**Files:**
- Modify: `src/app/(authenticated)/page.tsx`

**Step 1: Replace the redirect with the full dashboard**

Replace the contents of `src/app/(authenticated)/page.tsx`:

```typescript
import Link from "next/link";
import { getDashboardData } from "@/actions/dashboard";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardClient data={data} />;
}
```

**Step 2: Create the dashboard client component**

Create `src/components/dashboard/dashboard-client.tsx`:

```typescript
"use client";

import Link from "next/link";
import type { DashboardData } from "@/actions/dashboard";

const STATUS_COLORS: Record<string, string> = {
  enquiry: "bg-grey/20 text-grey",
  confirmed: "bg-cognac/20 text-cognac",
  preparation: "bg-gold/20 text-gold",
  ready: "bg-botanical/20 text-botanical",
  delivered: "bg-success/20 text-success",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function pluralise(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const greeting = getGreeting();

  // Zero-events empty state
  if (!data.nextEvent && data.upcoming.length === 0 && data.actions.length === 0) {
    return (
      <div className="py-16">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight mb-3">
          {greeting}, {data.userName}.
        </h1>
        <p className="font-[family-name:var(--font-raleway)] text-base text-gold-ink leading-relaxed mb-6 max-w-lg">
          Let&apos;s get your first event on the books. Once you create an event,
          this dashboard will show upcoming dates, action items, and revenue at a glance.
        </p>
        <Link
          href="/events/new"
          className="inline-block px-8 py-3 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 min-h-[44px]"
        >
          ADD YOUR FIRST EVENT
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* 1st: Greeting + next event countdown */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
          {greeting}, {data.userName}.
        </h1>
        {data.nextEvent ? (
          <p className="font-[family-name:var(--font-raleway)] text-base text-gold-ink mt-1">
            <Link
              href={`/events/${data.nextEvent.id}`}
              className="text-gold hover:text-gold-ink transition-colors duration-200 font-semibold"
            >
              {data.nextEvent.eventName}
            </Link>
            {data.nextEvent.daysUntil === 0
              ? " is today."
              : data.nextEvent.daysUntil === 1
                ? " is tomorrow."
                : ` is in ${data.nextEvent.daysUntil} days.`}
          </p>
        ) : (
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mt-1">
            No upcoming events scheduled.
          </p>
        )}
      </div>

      {/* 2nd: 3 metric tiles */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-low p-5">
          <p className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
            {data.eventsThisWeek}
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mt-1">
            {pluralise(data.eventsThisWeek, "Event", "Events")} this week
          </p>
        </div>

        <div className={`p-5 ${data.overdueItems > 0 ? "bg-cognac/10" : "bg-surface-low"}`}>
          <p className={`font-[family-name:var(--font-cormorant)] text-3xl font-light tracking-tight ${data.overdueItems > 0 ? "text-cognac" : "text-charcoal"}`}>
            {data.overdueItems}
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mt-1">
            {data.overdueItems === 0 ? "Nothing overdue" : pluralise(data.overdueItems, "Overdue item", "Overdue items")}
          </p>
        </div>

        <div className="bg-surface-low p-5">
          <p className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
            {formatCurrency(data.revenueThisMonth)}
          </p>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mt-1">
            Revenue this month
          </p>
        </div>
      </div>

      {/* 3rd: Action list — hidden entirely when empty */}
      {data.actions.length > 0 && (
        <section className="mb-8">
          <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
            Needs Attention
          </h2>
          <div className="space-y-1">
            {data.actions.map((action, i) => (
              <Link
                key={`${action.eventId}-${i}`}
                href={`/events/${action.eventId}`}
                className="flex items-center gap-3 py-3 border-b border-outline/10 hover:bg-surface-low/50 transition-colors duration-200"
              >
                <span className="w-2 h-2 bg-gold shrink-0" />
                <span className="font-[family-name:var(--font-raleway)] text-sm text-charcoal font-semibold">
                  {action.eventName}
                </span>
                <span className="font-[family-name:var(--font-raleway)] text-sm text-grey">
                  — {action.issue}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4th: Upcoming events (next 14 days) */}
      {data.upcoming.length > 0 ? (
        <section>
          <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
            Upcoming Events
          </h2>
          <div className="space-y-2">
            {data.upcoming.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between py-3 border-b border-outline/10 hover:bg-surface-low/50 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-charcoal">
                    {event.eventName}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium tracking-[0.16em] uppercase ${STATUS_COLORS[event.status] || STATUS_COLORS.enquiry}`}
                  >
                    {event.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey">
                  <span>{event.eventDate}</span>
                  <span>{event.venueName}</span>
                  <span>{event.guestCount}pp</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
            Upcoming Events
          </h2>
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
            No events in the next 14 days.{" "}
            <Link
              href="/events/new"
              className="text-gold hover:text-gold-ink transition-colors duration-200"
            >
              Add one?
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
```

**Step 3: Run dev server and test**

```bash
npm run dev
```

Verify:
- Dashboard loads at `/` with time-aware greeting
- Zero events → warm "Let's get your first event on the books" message with gold CTA
- With events → metric tiles show correctly; 0 overdue shows "Nothing overdue" (not "0 Overdue items")
- Revenue tile shows £0 when no invoiced events (not a blank)
- Action list hidden when nothing needs attention (no "Nothing to do!" placeholder)
- "No events in the next 14 days. Add one?" shows when upcoming section is empty
- Next event countdown shows "is today" / "is tomorrow" / "is in N days"

**Step 4: Commit**

```bash
git add src/app/\(authenticated\)/page.tsx src/components/dashboard/dashboard-client.tsx
git commit -m "feat: dashboard with greeting, metrics, actions, and upcoming events"
```

---

## Task 10: Brief preview slide-over on Send to LC

**Files:**
- Create: `src/components/events/brief-preview.tsx`
- Modify: `src/components/events/send-to-lc-button.tsx`
- Create: `src/actions/brief-preview.ts`

**Step 1: Create brief data fetcher**

Create `src/actions/brief-preview.ts`:

```typescript
"use server";

import { getEvent } from "./events";
import { getEventCocktails } from "./event-cocktails";
import { calculateStock } from "@/lib/stock-calculator";
import { requireRole } from "@/lib/session";

export interface BriefPreviewData {
  event: NonNullable<Awaited<ReturnType<typeof getEvent>>>;
  cocktails: Awaited<ReturnType<typeof getEventCocktails>>;
  stock: ReturnType<typeof calculateStock>;
}

export async function getBriefPreview(
  eventId: string
): Promise<BriefPreviewData | null> {
  await requireRole("owner", "super_admin");

  const event = await getEvent(eventId);
  if (!event) return null;

  const cocktails = await getEventCocktails(eventId);

  const stockInput = cocktails.map((ec) => {
    const totalServes =
      (event.prepaidServes || 0) + (event.cardPaymentServes || 0);
    const cocktailCount = cocktails.length;
    return {
      servesAllocated:
        ec.servesAllocated ||
        (cocktailCount > 0 ? Math.floor(totalServes / cocktailCount) : 0),
      ingredients: ec.ingredients.map((ing) => ({
        ingredientName: ing.ingredientName,
        amount: Number(ing.amount),
        unit: ing.unit as string,
        brand: ing.brand,
        ingredientCategory: (ing.ingredientCategory as string) || "other",
      })),
      garnishes: ec.garnishes.map((g) => ({
        garnishName: g.garnishName,
        quantity: Number(g.quantity),
        quantityUnit: g.quantityUnit || "piece",
      })),
    };
  });

  const stock = calculateStock(stockInput);
  return { event, cocktails, stock };
}
```

**Step 2: Create brief preview slide-over component**

Create `src/components/events/brief-preview.tsx`:

```typescript
"use client";

import type { BriefPreviewData } from "@/actions/brief-preview";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h3 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-gold tracking-tight mb-2">
        {title}
      </h3>
      <div className="font-[family-name:var(--font-raleway)] text-sm text-cream/80 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export function BriefPreview({
  data,
  onConfirm,
  onCancel,
  loading,
}: {
  data: BriefPreviewData;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { event, cocktails, stock } = data;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-charcoal/85 backdrop-blur-[20px]" />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-xl bg-charcoal/95 backdrop-blur-[20px] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-charcoal/95 backdrop-blur-[20px] px-8 py-6 border-b border-cream/10 z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.18em] uppercase text-grey">
                Brief Preview
              </p>
              <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-cream tracking-tight mt-1">
                {event.eventName}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="text-grey hover:text-cream text-sm transition-colors duration-200 cursor-pointer p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <Section title="Date">{event.eventDate}</Section>

          <Section title="Location">
            <p>
              {event.venueName}
              {event.venueHallRoom ? `, ${event.venueHallRoom}` : ""}
            </p>
            <p>{event.guestCount} guests</p>
          </Section>

          {(event.arriveTime || event.serviceStart) && (
            <Section title="Times">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {event.arriveTime && <span>Arrive: {event.arriveTime}</span>}
                {event.setupDeadline && (
                  <span>Setup by: {event.setupDeadline}</span>
                )}
                {event.serviceStart && (
                  <span>
                    Service: {event.serviceStart}
                    {event.serviceEnd ? ` — ${event.serviceEnd}` : ""}
                  </span>
                )}
                {event.departTime && <span>Depart: {event.departTime}</span>}
              </div>
            </Section>
          )}

          {event.contacts && event.contacts.length > 0 && (
            <Section title="Site Contacts">
              {event.contacts.map((c) => (
                <p key={c.id}>
                  {c.contactName}
                  {c.contactRole ? ` (${c.contactRole})` : ""}
                  {c.contactPhone ? ` — ${c.contactPhone}` : ""}
                </p>
              ))}
            </Section>
          )}

          {event.installInstructions && (
            <Section title="Install">
              <p className="whitespace-pre-wrap">
                {event.installInstructions}
              </p>
              {event.parkingInstructions && (
                <p className="mt-2">Parking: {event.parkingInstructions}</p>
              )}
              {event.accessRoute && (
                <p className="mt-1">Access: {event.accessRoute}</p>
              )}
            </Section>
          )}

          {cocktails.length > 0 && (
            <Section title="Cocktails">
              {cocktails.map((ec) => (
                <div key={ec.id} className="mb-4">
                  <p className="font-semibold text-cream">{ec.menuName}</p>
                  {ec.menuDescription && (
                    <p className="italic text-cream/50 text-sm">
                      {ec.menuDescription}
                    </p>
                  )}
                  <div className="mt-1 text-cream/60 text-sm">
                    {ec.ingredients.map((ing, i) => (
                      <span key={i}>
                        {ing.ingredientName} {ing.amount}
                        {ing.unit}
                        {i < ec.ingredients.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {stock.ingredients.length > 0 && (
            <Section title="Stock List">
              {stock.ingredients.map((ing, i) => (
                <p key={i}>
                  {ing.ingredientName}
                  {ing.brand ? ` (${ing.brand})` : ""}: {ing.purchaseUnits} x{" "}
                  {ing.bottleSize}ml
                </p>
              ))}
              {stock.garnishes.length > 0 && (
                <>
                  <p className="mt-3 font-semibold text-cream/70">Garnishes</p>
                  {stock.garnishes.map((g, i) => (
                    <p key={i}>
                      {g.garnishName}: {g.totalWithBuffer} {g.quantityUnit}
                    </p>
                  ))}
                </>
              )}
            </Section>
          )}

          {event.notesCustom && (
            <Section title="Notes">
              <p className="whitespace-pre-wrap">{event.notesCustom}</p>
            </Section>
          )}
        </div>

        {/* Footer — sticky confirm button */}
        <div className="sticky bottom-0 bg-charcoal/95 backdrop-blur-[20px] px-8 py-6 border-t border-cream/10">
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {loading ? "SENDING..." : "CONFIRM & SEND"}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-3 border border-cream/20 text-cream/60 font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:text-cream hover:border-cream/40 transition-colors duration-200 min-h-[44px] cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Update SendToLCButton to use the preview**

Replace `src/components/events/send-to-lc-button.tsx`:

```typescript
"use client";

import { useState } from "react";
import { sendToLC, confirmResendToLC } from "@/actions/send-to-lc";
import { getBriefPreview, type BriefPreviewData } from "@/actions/brief-preview";
import { BriefPreview } from "./brief-preview";

export function SendToLCButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<BriefPreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    needsConfirmation?: boolean;
  } | null>(null);

  async function handleOpenPreview() {
    setLoading(true);
    setResult(null);
    const data = await getBriefPreview(eventId);
    setLoading(false);
    if (data) {
      setPreviewData(data);
      setShowPreview(true);
    }
  }

  async function handleConfirmSend() {
    setLoading(true);
    const res = await sendToLC(eventId);
    setLoading(false);

    if (res.needsConfirmation) {
      // Already sent — close preview, show resend dialog
      setShowPreview(false);
      setResult(res);
      return;
    }

    setShowPreview(false);
    setResult(res);
  }

  async function handleConfirmResend() {
    setLoading(true);
    setResult(null);
    const res = await confirmResendToLC(eventId);
    setLoading(false);
    setResult(res);
  }

  return (
    <div>
      {/* Brief preview slide-over */}
      {showPreview && previewData && (
        <BriefPreview
          data={previewData}
          onConfirm={handleConfirmSend}
          onCancel={() => setShowPreview(false)}
          loading={loading}
        />
      )}

      {/* Confirmation dialog for re-send */}
      {result?.needsConfirmation && (
        <div className="bg-warning/10 border border-warning/20 p-4 mb-4">
          <p className="font-[family-name:var(--font-raleway)] text-sm text-warning mb-3">
            {result.error}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleConfirmResend}
              disabled={loading}
              className="px-5 py-2 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {loading ? "SENDING..." : "SEND AGAIN"}
            </button>
            <button
              onClick={() => setResult(null)}
              className="px-5 py-2 border border-grey/30 text-grey font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:text-charcoal transition-colors duration-200 min-h-[44px] cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Success message */}
      {result?.success && (
        <div className="bg-success/10 border border-success/20 p-4 mb-4">
          <p className="font-[family-name:var(--font-raleway)] text-sm text-success">
            Brief sent to LC successfully
          </p>
        </div>
      )}

      {/* Error message (non-confirmation) */}
      {result?.error && !result?.needsConfirmation && (
        <div className="bg-error/10 border border-error/20 p-4 mb-4">
          <p className="font-[family-name:var(--font-raleway)] text-sm text-error">
            {result.error}
          </p>
        </div>
      )}

      {/* Send button — opens preview */}
      {!result?.needsConfirmation && (
        <button
          onClick={handleOpenPreview}
          disabled={loading}
          className="px-8 py-3 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
        >
          {loading ? "LOADING..." : "SEND TO LC"}
        </button>
      )}
    </div>
  );
}
```

**Step 4: Run dev server and test**

```bash
npm run dev
```

Verify:
- "SEND TO LC" button now opens a slide-over panel (not direct send)
- Panel shows brief preview with all event data, cocktails, stock
- Glass-texture overlay (charcoal/blur) matches DESIGN.md
- "CONFIRM & SEND" dispatches the email
- "CANCEL" closes the panel without sending
- Clicking the backdrop also closes
- Re-send flow still works (shows warning dialog after preview)
- Empty brief (no cocktails, etc.) still previews correctly with available sections

**Step 5: Commit**

```bash
git add src/actions/brief-preview.ts src/components/events/brief-preview.tsx src/components/events/send-to-lc-button.tsx
git commit -m "feat: brief preview slide-over before Send to LC dispatch"
```

---

## Task 11: TypeScript check and test suite

**Files:**
- No new files

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors that surface.

**Step 2: Run tests**

```bash
npm run test -- --run
```

All existing tests plus the new checklist template test should pass.

**Step 3: Run build**

```bash
npm run build
```

Ensure production build succeeds.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: TypeScript and build fixes for Phase 2"
```

---

## Task 12: Final integration test in dev

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test the full Phase 2 flow**

Walk through in the browser:

1. **Dashboard (zero events):** Visit `/`. Should see "Good morning, [name]. Let's get your first event on the books." with gold "ADD YOUR FIRST EVENT" button.
2. **Create an event:** Fill out the form, save. Dashboard should now show the event in "Upcoming Events" and metric tile "1 Event this week" (if this week).
3. **Events list view:** Visit `/events`. Toggle to KANBAN — card appears in Enquiry column. Toggle back to LIST — DataTable with search.
4. **Kanban drag:** Drag the card from Enquiry to Confirmed. Status updates.
5. **Checklist auto-generated:** Open the event. Checklist tab should show "8/0 complete" with 8 items.
6. **Toggle checklist items:** Check a few items. Progress bar updates. Strike-through animation.
7. **Add custom item:** Type "Book accommodation" and hit ADD. Appears at bottom with REMOVE on hover.
8. **Brief preview:** Click "SEND TO LC". Slide-over panel opens with brief preview. Click CANCEL — no email sent. Click "SEND TO LC" again, then "CONFIRM & SEND" — email dispatched.
9. **Dashboard with data:** Return to `/`. Should show greeting, metric tiles, action items (if any), and upcoming events.
10. **Dashboard overdue metric:** If an event's date is in the past and status isn't "delivered", overdue count should be > 0 with cognac highlight. If 0, shows "Nothing overdue".
11. **Dashboard actions hidden when empty:** If all briefs are sent and checklists complete, the "Needs Attention" section should not appear at all.

**Step 3: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix: integration fixes from Phase 2 testing"
```

---

## Summary of empty state decisions

| Screen | Zero-data message | CTA |
|---|---|---|
| Dashboard (no events) | "Let's get your first event on the books." | ADD YOUR FIRST EVENT |
| Dashboard (no upcoming) | "No events in the next 14 days." | "Add one?" link |
| Dashboard (no overdue) | Metric tile shows "0" + "Nothing overdue" | — |
| Dashboard (no actions) | Entire "Needs Attention" section hidden | — |
| Dashboard (£0 revenue) | Metric tile shows "£0" + "Revenue this month" | — |
| Events (no events) | "No events yet" | CREATE YOUR FIRST EVENT |
| Events search (no match) | "No events match '[query]'" | CLEAR SEARCH |
| Kanban (empty column) | Column header + count "0", no placeholder | — |
| Checklist (pre-confirmed) | "Awaiting Confirmation" | Advance status |
| Checklist (all done) | "All items complete. This event is ready." | — |
