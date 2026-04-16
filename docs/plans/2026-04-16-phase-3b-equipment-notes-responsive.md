# Phase 3b: Equipment Templates, Standard Notes & Responsive Sidebar

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add equipment template auto-scaling per event, standard notes bank with tick-on/tick-off, and responsive sidebar with mobile top bar.

**Architecture:** Equipment templates are stored as reusable templates with items that scale based on event properties (station count, spirit count, ingredient count). Standard notes are a bank of predefined notes that can be toggled on/off per event. The responsive sidebar collapses to icon-only on tablet and becomes a hamburger overlay on mobile.

**Tech Stack:** Next.js 16.2, React 19, TypeScript 5, Tailwind v4, Drizzle ORM, NeonDB, Vitest

---

## Task 1: Equipment template schema

Add 3 new tables: `equipment_templates`, `equipment_template_items`, `event_equipment`.

**Files:**
- Modify: `src/db/schema.ts`

**Step 1: Add scaling rule enum**

After the existing enums (around line 87), add:

```typescript
export const scalingRuleEnum = pgEnum("scaling_rule", [
  "per_station",
  "fixed",
  "per_spirit",
  "per_ingredient",
]);
```

**Step 2: Add equipment_templates table**

```typescript
export const equipmentTemplates = pgTable("equipment_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Step 3: Add equipment_template_items table**

```typescript
export const equipmentTemplateItems = pgTable("equipment_template_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id")
    .references(() => equipmentTemplates.id, { onDelete: "cascade" })
    .notNull(),
  itemName: text("item_name").notNull(),
  baseQuantity: integer("base_quantity").notNull().default(1),
  scalingRule: scalingRuleEnum("scaling_rule").notNull().default("fixed"),
  sortOrder: integer("sort_order").default(0).notNull(),
});
```

**Step 4: Add event_equipment table (junction)**

```typescript
export const eventEquipment = pgTable("event_equipment", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull(),
  isFromTemplate: boolean("is_from_template").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});
```

**Step 5: Add relations**

```typescript
export const equipmentTemplatesRelations = relations(equipmentTemplates, ({ many }) => ({
  items: many(equipmentTemplateItems),
}));

export const equipmentTemplateItemsRelations = relations(equipmentTemplateItems, ({ one }) => ({
  template: one(equipmentTemplates, {
    fields: [equipmentTemplateItems.templateId],
    references: [equipmentTemplates.id],
  }),
}));

export const eventEquipmentRelations = relations(eventEquipment, ({ one }) => ({
  event: one(events, {
    fields: [eventEquipment.eventId],
    references: [events.id],
  }),
}));
```

Also add `equipment: many(eventEquipment)` to `eventsRelations`.

**Step 6: Push schema**

```bash
export $(grep -v '^#' .env.local | xargs) && npx drizzle-kit push
```

**Step 7: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add equipment_templates, equipment_template_items, event_equipment tables"
```

---

## Task 2: Equipment scaling logic (TDD)

Pure function that takes a template's items + event context and returns scaled quantities.

**Files:**
- Create: `src/lib/equipment-scaler.ts`
- Create: `src/lib/equipment-scaler.test.ts`

**Step 1: Write failing tests**

```typescript
// src/lib/equipment-scaler.test.ts
import { describe, it, expect } from "vitest";
import { scaleEquipment } from "./equipment-scaler";

describe("scaleEquipment", () => {
  const baseItems = [
    { itemName: "Boston Shaker", baseQuantity: 1, scalingRule: "per_station" as const },
    { itemName: "First Aid Kit", baseQuantity: 1, scalingRule: "fixed" as const },
    { itemName: "Store N Pour", baseQuantity: 1, scalingRule: "per_spirit" as const },
    { itemName: "Garnish Box", baseQuantity: 1, scalingRule: "per_ingredient" as const },
  ];

  it("scales per_station items by station count", () => {
    const result = scaleEquipment(baseItems, { stationCount: 4, spiritCount: 3, ingredientCount: 8 });
    expect(result.find((r) => r.itemName === "Boston Shaker")?.quantity).toBe(4);
  });

  it("keeps fixed items unchanged", () => {
    const result = scaleEquipment(baseItems, { stationCount: 4, spiritCount: 3, ingredientCount: 8 });
    expect(result.find((r) => r.itemName === "First Aid Kit")?.quantity).toBe(1);
  });

  it("scales per_spirit items by distinct spirit count", () => {
    const result = scaleEquipment(baseItems, { stationCount: 4, spiritCount: 3, ingredientCount: 8 });
    expect(result.find((r) => r.itemName === "Store N Pour")?.quantity).toBe(3);
  });

  it("scales per_ingredient items by ingredient count", () => {
    const result = scaleEquipment(baseItems, { stationCount: 4, spiritCount: 3, ingredientCount: 8 });
    expect(result.find((r) => r.itemName === "Garnish Box")?.quantity).toBe(8);
  });

  it("defaults to 1 station when stationCount is 0 or undefined", () => {
    const result = scaleEquipment(baseItems, { stationCount: 0, spiritCount: 3, ingredientCount: 8 });
    expect(result.find((r) => r.itemName === "Boston Shaker")?.quantity).toBe(1);
  });

  it("scales baseQuantity > 1 correctly", () => {
    const items = [{ itemName: "Ice Scoop", baseQuantity: 2, scalingRule: "per_station" as const }];
    const result = scaleEquipment(items, { stationCount: 3, spiritCount: 0, ingredientCount: 0 });
    expect(result.find((r) => r.itemName === "Ice Scoop")?.quantity).toBe(6);
  });
});
```

**Step 2: Run tests — should FAIL**

```bash
npm run test -- --run src/lib/equipment-scaler.test.ts
```

**Step 3: Implement**

```typescript
// src/lib/equipment-scaler.ts
interface TemplateItem {
  itemName: string;
  baseQuantity: number;
  scalingRule: "per_station" | "fixed" | "per_spirit" | "per_ingredient";
}

interface EventContext {
  stationCount: number;
  spiritCount: number;
  ingredientCount: number;
}

interface ScaledItem {
  itemName: string;
  quantity: number;
}

export function scaleEquipment(
  items: TemplateItem[],
  context: EventContext
): ScaledItem[] {
  const stations = Math.max(context.stationCount, 1);

  return items.map((item) => {
    let multiplier: number;
    switch (item.scalingRule) {
      case "per_station":
        multiplier = stations;
        break;
      case "per_spirit":
        multiplier = Math.max(context.spiritCount, 1);
        break;
      case "per_ingredient":
        multiplier = Math.max(context.ingredientCount, 1);
        break;
      case "fixed":
      default:
        multiplier = 1;
        break;
    }
    return {
      itemName: item.itemName,
      quantity: item.baseQuantity * multiplier,
    };
  });
}
```

**Step 4: Run tests — should PASS**

```bash
npm run test -- --run src/lib/equipment-scaler.test.ts
```

**Step 5: Commit**

```bash
git add src/lib/equipment-scaler.ts src/lib/equipment-scaler.test.ts
git commit -m "feat: equipment scaling logic with TDD (per_station, fixed, per_spirit, per_ingredient)"
```

---

## Task 3: Seed equipment templates

Create 3 templates: Corporate/Private, Exhibition, Smoothie.

**Files:**
- Create: `src/db/seed-equipment-templates.ts` (run once, then delete)

**Step 1: Write seed script**

Based on the Specsavers brief, a corporate template includes:
- Boston Shakers (per_station)
- Bar Spoons (per_station)
- Jiggers (per_station)
- Fruit Knives + Boards (per_station)
- Store N Pours (per_spirit)
- Glass Bottles for juice (per_ingredient, liquid ingredients)
- Ice Boxes (per_station)
- Ice Buckets (per_station)
- Ice Scoops (per_station)
- Cleaning Kit (fixed)
- First Aid Kit (fixed)
- Black Bin Bags (fixed)
- Straw Caddy (fixed)
- Black Napkins (fixed)

Exhibition adds: Banner stand, Table cover, Extension leads, Signage (all fixed).

**Step 2: Run seed, then delete script**

**Step 3: Commit**

```bash
git commit -m "feat: seed 3 equipment templates (corporate, exhibition, smoothie)"
```

---

## Task 4: Equipment server actions

CRUD for applying templates to events and managing event equipment.

**Files:**
- Create: `src/actions/equipment.ts`

**Actions needed:**
- `getEquipmentTemplates()` — list all active templates with items
- `getEventEquipment(eventId)` — get equipment for an event
- `applyTemplate(eventId, templateId)` — scale and insert equipment from template
- `addCustomEquipmentItem(eventId, itemName, quantity)` — add manual item
- `removeEquipmentItem(itemId, eventId)` — remove with ownership check
- `updateEquipmentQuantity(itemId, eventId, quantity)` — update quantity

All actions require `owner` or `super_admin` role.

**Step 1: Implement actions**

**Step 2: Commit**

```bash
git commit -m "feat: equipment server actions — apply template, add/remove/update items"
```

---

## Task 5: Equipment tab on event detail page

Add an Equipment tab between Stock List and Checklist in the event detail.

**Files:**
- Create: `src/components/events/event-equipment.tsx`
- Modify: `src/app/(authenticated)/events/[id]/page.tsx`

**UI Design:**
- "Apply Template" dropdown at top (Corporate, Exhibition, Smoothie)
- Equipment list showing item name + scaled quantity
- Editable quantity field
- Remove button per item
- "Add Custom Item" input at bottom
- Partner sees equipment read-only (no add/remove/template buttons)

**Step 1: Create EventEquipment component**

**Step 2: Add Equipment tab to event detail page**

Add between Stock List and Checklist (for owner/admin), or between Stock List and the end (for partner — read-only view of equipment).

**Step 3: Commit**

```bash
git commit -m "feat: equipment tab on event detail with template application and scaling"
```

---

## Task 6: Standard notes schema

**Files:**
- Modify: `src/db/schema.ts`

**Step 1: Add tables**

```typescript
export const standardNotes = pgTable("standard_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventStandardNotes = pgTable("event_standard_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  noteId: uuid("note_id")
    .references(() => standardNotes.id)
    .notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});
```

**Step 2: Add relations**

**Step 3: Push schema and seed standard notes**

Seed with common notes like:
- "Attire: All black. Smart casual."
- "All stock to be returned to Bar Excellence warehouse."
- "Murdo to be contacted for any changes to the brief."
- "All glassware to be hand-washed and returned to crates."
- "Dry ice handling: gloves required, do not touch with bare hands."

**Step 4: Commit**

```bash
git commit -m "feat: standard_notes and event_standard_notes tables + seed data"
```

---

## Task 7: Standard notes toggle UI

**Files:**
- Create: `src/actions/standard-notes.ts`
- Create: `src/components/events/event-notes.tsx`
- Modify: `src/app/(authenticated)/events/[id]/page.tsx`

**UI Design:**
- In the Overview tab, below the existing "Notes" section
- "Standard Notes" heading
- List of available notes with toggle checkboxes
- Toggling on adds the note to the event, toggling off removes it
- Selected notes appear in the brief (Send to LC / PDF)
- Partner sees selected notes read-only (no toggles)

**Step 1: Create server actions**

**Step 2: Create toggle component**

**Step 3: Wire into event detail Overview tab**

**Step 4: Commit**

```bash
git commit -m "feat: standard notes toggle UI in event overview"
```

---

## Task 8: Responsive sidebar — tablet collapse

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/app-shell.tsx`

**Behavior:** At 768-1023px, sidebar collapses to icon-only (64px). Each nav item shows only an icon. Hovering expands a tooltip with the label.

**Step 1: Add icons**

Use simple SVG icons (no icon library needed for 3 items):
- Dashboard: grid/squares icon
- Events: calendar icon
- Recipes: book icon

**Step 2: Add responsive classes**

Sidebar: `w-64 md:w-16 lg:w-64`
Nav labels: `hidden md:hidden lg:inline`
Brand text: `hidden md:hidden lg:block`

**Step 3: Adjust main content**

AppShell main area adjusts with sidebar width changes.

**Step 4: Test at tablet width, commit**

```bash
git commit -m "feat: responsive sidebar — collapses to icon-only on tablet"
```

---

## Task 9: Responsive sidebar — mobile hamburger + top bar

**Files:**
- Create: `src/components/layout/mobile-top-bar.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/app-shell.tsx`

**Behavior:** Below 768px, sidebar is hidden. A 56px top bar shows hamburger + "Bar Excellence" + user avatar. Tapping hamburger opens sidebar as a glass-texture overlay (charcoal 85% opacity, 20px blur, slides from left).

**Step 1: Create MobileTopBar component**

```
+----------------------------------+
| ☰  Bar Excellence    [Avatar]    |
+----------------------------------+
```
- Height: 56px, charcoal bg
- Hamburger and avatar: 44px touch targets
- Brand: Cormorant Garamond, cream text

**Step 2: Modify AppShell for mobile layout**

- Show MobileTopBar only below md breakpoint
- Show Sidebar only at md+ by default
- Add state for mobile sidebar open/close
- Sidebar overlay: glass texture, slide-from-left animation

**Step 3: Test on mobile viewport, commit**

```bash
git commit -m "feat: mobile top bar + hamburger sidebar overlay with glass texture"
```

---

## Task 10: Quick Capture FAB (mobile)

**Files:**
- Create: `src/components/layout/quick-capture-fab.tsx`
- Modify: `src/components/layout/app-shell.tsx`

**Behavior:** Fixed bottom-right on mobile (<768px), 56px gold circle, 16px from edges. Tapping opens a bottom sheet with 3 options:
1. "Add Enquiry" — navigates to quick-add (reuse dashboard's 4-field form pattern)
2. "Log Note" — opens text input, saves to most recent event's custom notes
3. "Mark Checklist Item" — shows next incomplete checklist item from nearest event

**This is the lowest priority item.** Only implement if time allows.

**Step 1: Create FAB component (gold circle, md:hidden)**

**Step 2: Create bottom sheet with 3 actions**

**Step 3: Wire "Add Enquiry" to create event flow**

**Step 4: Commit**

```bash
git commit -m "feat: Quick Capture FAB for mobile — add enquiry, log note, mark checklist"
```

---

## Task 11: Build + test suite + QA

**Step 1: Run all tests**

```bash
npm run test -- --run
```

**Step 2: Run build**

```bash
npm run build
```

**Step 3: Manual QA**

- Test equipment template application on the Specsavers event
- Toggle standard notes on NEC exhibition event
- Resize browser to tablet (768px) — sidebar should collapse to icons
- Resize to mobile (<768px) — top bar + hamburger overlay
- Log in as partner — verify equipment visible read-only, notes visible read-only

**Step 4: Commit fixes**

---

## Priority Order

| Task | Feature | Priority | Complexity |
|------|---------|----------|------------|
| 1 | Equipment schema | Critical | Low |
| 2 | Equipment scaling (TDD) | Critical | Medium |
| 3 | Seed templates | Critical | Low |
| 4 | Equipment actions | Critical | Medium |
| 5 | Equipment tab UI | Critical | Medium |
| 6 | Standard notes schema | High | Low |
| 7 | Standard notes toggle | High | Medium |
| 8 | Responsive sidebar tablet | Medium | Medium |
| 9 | Responsive sidebar mobile | Medium | High |
| 10 | Quick Capture FAB | Low | High |
| 11 | Build + QA | Critical | — |

**Recommended cut line:** Tasks 1-7 (equipment + notes) are the core value. Tasks 8-10 (responsive + FAB) can follow in a Phase 3c if needed.
