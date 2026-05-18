# Real Event Seed + Gap Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed two historical Bar Excellence events (Heathrow masterclass 2026-05-15, Glasgow signature service 2026-04-23) into the local DB along with Murdo's 6 real cocktail recipes, then write a gap report comparing the rendered event sheet against each source PDF.

**Architecture:** Pure data work in `src/db/seed.ts` — no schema migrations, no app source changes. Replace the 9 placeholder cocktails with 6 real recipes from the PDFs; add reusable `standardNotes` and `equipmentTemplates`; insert 2 events with all related rows (`eventContacts`, `eventCocktails`, `eventEquipment`, `eventStandardNotes`). After seeding, manually walk both events in the UI, render the event sheet, and produce a gap report at `docs/plans/2026-05-18-event-sheet-gap-report.md` for follow-up schema spec work.

**Tech Stack:** Next.js 16.2, Drizzle ORM, NeonDB, TypeScript, Vitest. Seed runs via `npx tsx src/db/seed.ts` (no npm script today — Task 1 adds one).

**Spec reference:** `docs/superpowers/specs/2026-05-18-real-event-seed-and-gap-report-design.md`

---

## File Structure

- **Modify:** `src/db/seed.ts` — replace cocktail data, add standardNotes/equipmentTemplates seeding, add 2 events with relations. Add cleanup at top so seed is re-runnable.
- **Modify:** `package.json` — add `"seed"` script for `tsx src/db/seed.ts`.
- **Modify:** `TODOS.md` — strike "Get Murdo's cocktail recipes" line.
- **Create:** `docs/plans/2026-05-18-event-sheet-gap-report.md` — produced after walking the UI.

`seed.ts` will remain a single file. The existing flat-data + loop pattern is used throughout — keep the pattern. New sections (notes, templates, events) follow the same style.

---

## Task 1: Add `seed` npm script and re-run safety

**Files:**
- Modify: `package.json:5-13`
- Modify: `src/db/seed.ts:1-15` (imports + new cleanup logic)

The current seed.ts has no `.onConflictDoNothing()` on cocktails, so running twice creates duplicates. The cleanest fix is a destructive cleanup of the tables we own at the top of seed. We're only touching the local dev DB.

- [ ] **Step 1: Add `seed` script to package.json**

In `package.json`, change the `"scripts"` block to add a line after `"test:e2e:ui"`:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "seed": "tsx src/db/seed.ts"
  },
```

- [ ] **Step 2: Add new imports + cleanup to top of seed.ts**

Replace the import block at the top of `src/db/seed.ts` (lines 1-10) with:

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  users,
  cocktails,
  cocktailIngredients,
  cocktailGarnishes,
  events,
  eventContacts,
  eventCocktails,
  eventEquipment,
  eventStandardNotes,
  standardNotes,
  equipmentTemplates,
  equipmentTemplateItems,
} from "./schema";
```

Then right after `const db = drizzle(sql);` and before `async function seed()`, add a cleanup helper:

```ts
async function cleanup() {
  console.log("Cleaning existing seed data (cocktails, events, notes, templates)...");
  // Order matters: delete children before parents.
  await db.delete(eventEquipment);
  await db.delete(eventCocktails);
  await db.delete(eventContacts);
  await db.delete(eventStandardNotes);
  await db.delete(events);
  await db.delete(cocktailIngredients);
  await db.delete(cocktailGarnishes);
  await db.delete(cocktails);
  await db.delete(equipmentTemplateItems);
  await db.delete(equipmentTemplates);
  await db.delete(standardNotes);
}
```

In the `seed()` function, add `await cleanup();` as the very first line inside the function.

- [ ] **Step 3: Run seed to confirm cleanup works**

```bash
npm run seed
```

Expected: "Cleaning existing seed data..." prints, then it proceeds through the existing placeholder cocktail seed and finishes with "Seed complete!" — no duplicates, no errors. The DB now has only the existing placeholder cocktails (we replace them in Task 4).

- [ ] **Step 4: Commit**

```bash
git add package.json src/db/seed.ts
git commit -m "chore(seed): add npm script and re-runnable cleanup

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Seed `standardNotes` with 4 reusable boilerplate blocks

**Files:**
- Modify: `src/db/seed.ts` (insert new block after cocktails section)

Both PDFs repeat the same 4 boilerplate notes verbatim. Seeded as `standardNotes` rows so events can attach them via `eventStandardNotes`.

- [ ] **Step 1: Add standard notes data + insert in seed.ts**

After the cocktail seeding loop (after the closing `}` of `for (const c of cocktailData)`) and before `console.log("\nSeed complete!");`, add:

```ts
  // ── Standard Notes ─────────────────────────────────
  console.log("Seeding standard notes...");

  const standardNotesData = [
    {
      label: "Attire",
      content:
        "All extended team must arrive to site already in set attire:\n- Black bow ties\n- Black waistcoats\n- White ironed shirts\n- Smart black trousers (not jeans)\n- Polished black shoes (not trainers)",
      sortOrder: 0,
    },
    {
      label: "Problem Escalation",
      content:
        "Any problems to solve, Murdo will be there for first few hours. After that, call him with anything to solve. Do not ask the venue teams.",
      sortOrder: 1,
    },
    {
      label: "Stock Movement",
      content:
        "All alcohol and ingredients must be moved in sealed boxes from the vehicle through the building to the event space. No bags or open boxes. Bring a trolley to move the items.",
      sortOrder: 2,
    },
    {
      label: "On-Site Washing",
      content: "We are not washing any glasses on site.",
      sortOrder: 3,
    },
  ];

  const insertedNotes = await db
    .insert(standardNotes)
    .values(standardNotesData)
    .returning({ id: standardNotes.id, label: standardNotes.label });

  const noteIdByLabel = new Map(insertedNotes.map((n) => [n.label, n.id]));
  console.log(`  ✓ ${insertedNotes.length} standard notes`);
```

- [ ] **Step 2: Run seed and verify**

```bash
npm run seed
```

Expected output includes: `Seeding standard notes...` then `✓ 4 standard notes`. No errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): add 4 reusable standard notes from event PDFs

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Seed `equipmentTemplates` (Bartender Kit + Service Setup)

**Files:**
- Modify: `src/db/seed.ts`

Two templates inferred from the kit sections of both PDFs.

- [ ] **Step 1: Add equipment templates after standard notes section**

After the standard notes block (after `console.log` for notes count), add:

```ts
  // ── Equipment Templates ────────────────────────────
  console.log("Seeding equipment templates...");

  const equipmentTemplatesData = [
    {
      name: "Bartender Kit",
      description: "Per-station bartender toolkit; scales with stationCount.",
      items: [
        { itemName: "Speedpour", baseQuantity: 6, scalingRule: "per_station" as const, sortOrder: 0 },
        { itemName: "Fruit knife", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 1 },
        { itemName: "Chopping board", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 2 },
        { itemName: "Cocktail shaker (3-piece)", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 3 },
        { itemName: "Hawthorn strainer", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 4 },
        { itemName: "Fine strainer", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 5 },
        { itemName: "Squeeze bottle", baseQuantity: 4, scalingRule: "per_station" as const, sortOrder: 6 },
        { itemName: "Bar spoon", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 7 },
      ],
    },
    {
      name: "Service Setup",
      description: "Core event setup — bins, first aid, menu, ice service.",
      items: [
        { itemName: "Bin", baseQuantity: 2, scalingRule: "fixed" as const, sortOrder: 0 },
        { itemName: "Bin liners (pack)", baseQuantity: 1, scalingRule: "fixed" as const, sortOrder: 1 },
        { itemName: "Brush and dustpan", baseQuantity: 1, scalingRule: "fixed" as const, sortOrder: 2 },
        { itemName: "First aid kit", baseQuantity: 1, scalingRule: "fixed" as const, sortOrder: 3 },
        { itemName: "Menu in holder", baseQuantity: 1, scalingRule: "fixed" as const, sortOrder: 4 },
        { itemName: "Ice bucket", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 5 },
        { itemName: "Ice scoop", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 6 },
        { itemName: "Fruit plate", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 7 },
      ],
    },
  ];

  for (const tmpl of equipmentTemplatesData) {
    const { items, ...templateRow } = tmpl;
    const [inserted] = await db
      .insert(equipmentTemplates)
      .values(templateRow)
      .returning({ id: equipmentTemplates.id });
    await db.insert(equipmentTemplateItems).values(
      items.map((it) => ({ ...it, templateId: inserted.id }))
    );
    console.log(`  ✓ ${tmpl.name} (${items.length} items)`);
  }
```

- [ ] **Step 2: Run seed and verify**

```bash
npm run seed
```

Expected: `Seeding equipment templates...` then `✓ Bartender Kit (8 items)` and `✓ Service Setup (8 items)`.

- [ ] **Step 3: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): add Bartender Kit + Service Setup equipment templates

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Replace 9 placeholder cocktails with 6 real recipes

**Files:**
- Modify: `src/db/seed.ts:38-231` (the entire `cocktailData` array)

Replace the placeholders (Espresso Martini, Negroni, Mojito, Old Fashioned, Margarita, Whiskey Sour, Cosmopolitan, Daiquiri, Aperol Spritz, Placebo NA) with Murdo's 6 real signature cocktails from the PDFs.

Source: Heathrow PDF p2-3, Glasgow PDF p2-4.

- [ ] **Step 1: Replace the entire `cocktailData` array**

In `src/db/seed.ts`, find the existing `const cocktailData = [` line (around line 38) and replace everything up to its closing `];` (around line 231) with:

```ts
  const cocktailData = [
    {
      name: "Spiced Passionstar",
      defaultMenuName: "Spiced Passionstar",
      defaultMenuDescription:
        "Spiced rum, passionfruit, freshly squeezed lemon, pineapple & glistening with edible glitter",
      season: "all_year" as const,
      glassType: "rocks" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      straw: true,
      strawType: "Black short cardboard",
      category: "Signature",
      isNonAlcoholic: false,
      ingredients: [
        { ingredientName: "Spiced Rum", ingredientCategory: "spirit" as const, amount: "25", unit: "ml" as const, brand: null, sortOrder: 0 },
        { ingredientName: "Passionfruit Puree", ingredientCategory: "puree" as const, amount: "25", unit: "ml" as const, brand: "Boiron", sortOrder: 1 },
        { ingredientName: "Gomme", ingredientCategory: "syrup" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 2 },
        { ingredientName: "Lemon", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: "Boiron", sortOrder: 3 },
        { ingredientName: "Pineapple Juice", ingredientCategory: "juice" as const, amount: "75", unit: "ml" as const, brand: null, sortOrder: 4 },
      ],
      garnishes: [
        { garnishName: "Passionfruit Quarter (float)", garnishCategory: "fruit" as const, quantity: "0.25", quantityUnit: "whole", sortOrder: 0 },
        { garnishName: "Pineapple Leaf", garnishCategory: "botanical" as const, quantity: "1", quantityUnit: "piece", sortOrder: 1 },
        { garnishName: "Edible Gold Duster Spray", garnishCategory: "spray" as const, quantity: "1", quantityUnit: "spray", sortOrder: 2 },
      ],
    },
    {
      name: "Springtime Clover Club",
      defaultMenuName: "Springtime Clover Club",
      defaultMenuDescription:
        "Gin, raspberries, mint, freshly squeezed lemon, elderflower & cloudy apple",
      season: "spring" as const,
      glassType: "coupe" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      straw: false,
      category: "Signature",
      isNonAlcoholic: false,
      notes: "Source PDF menu description mentions 'cloudy apple' but the spec lists no apple juice — seeded without apple. Flag in gap report.",
      ingredients: [
        { ingredientName: "Gin", ingredientCategory: "spirit" as const, amount: "25", unit: "ml" as const, brand: null, sortOrder: 0 },
        { ingredientName: "Raspberry Puree", ingredientCategory: "puree" as const, amount: "25", unit: "ml" as const, brand: "Boiron", sortOrder: 1 },
        { ingredientName: "Lemon", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: "Boiron", sortOrder: 2 },
        { ingredientName: "Gomme", ingredientCategory: "syrup" as const, amount: "10", unit: "ml" as const, brand: null, sortOrder: 3 },
        { ingredientName: "Elderflower Cordial", ingredientCategory: "modifier" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 4 },
        { ingredientName: "Miraculous Foamer", ingredientCategory: "foamer" as const, amount: "3", unit: "drops" as const, brand: null, sortOrder: 5 },
      ],
      garnishes: [
        { garnishName: "Fresh Raspberry", garnishCategory: "fruit" as const, quantity: "2", quantityUnit: "piece", sortOrder: 0 },
        { garnishName: "Mint Sprig", garnishCategory: "botanical" as const, quantity: "1", quantityUnit: "sprig", sortOrder: 1 },
        { garnishName: "Bamboo Spear", garnishCategory: "decorative" as const, quantity: "1", quantityUnit: "piece", sortOrder: 2 },
      ],
    },
    {
      name: "Clydeport Celebration",
      defaultMenuName: "Clydeport Celebration",
      defaultMenuDescription:
        "Drambuie, freshly squeezed lemon, cloudy apple & citrus foam, garnished with heather",
      season: "all_year" as const,
      glassType: "rocks" as const,
      iceAmountG: 200,
      iceType: "Crushed",
      straw: true,
      strawType: "Black short cardboard",
      category: "Signature",
      isNonAlcoholic: false,
      notes: "Source spec flagged Gomme as '10ml (check)' — confirm amount with Murdo.",
      ingredients: [
        { ingredientName: "Drambuie", ingredientCategory: "spirit" as const, amount: "50", unit: "ml" as const, brand: "Drambuie", sortOrder: 0 },
        { ingredientName: "Lemon", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: "Boiron", sortOrder: 1 },
        { ingredientName: "Apple Juice", ingredientCategory: "juice" as const, amount: "50", unit: "ml" as const, brand: null, sortOrder: 2 },
        { ingredientName: "Gomme", ingredientCategory: "syrup" as const, amount: "10", unit: "ml" as const, brand: null, sortOrder: 3 },
        { ingredientName: "Miraculous Foamer", ingredientCategory: "foamer" as const, amount: "3", unit: "drops" as const, brand: null, sortOrder: 4 },
      ],
      garnishes: [
        { garnishName: "Heather Sprig", garnishCategory: "botanical" as const, quantity: "1", quantityUnit: "sprig", sortOrder: 0 },
      ],
    },
    {
      name: "Barrowlands Stars",
      defaultMenuName: "Barrowlands Stars",
      defaultMenuDescription:
        "Spiced rum, passionfruit, freshly squeezed lemon & pineapple, with edible gold dust",
      season: "all_year" as const,
      glassType: "rocks" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      straw: true,
      strawType: "Black short cardboard",
      category: "Signature",
      isNonAlcoholic: false,
      notes: "Sister recipe of Spiced Passionstar (35ml rum vs 25ml).",
      ingredients: [
        { ingredientName: "Spiced Rum", ingredientCategory: "spirit" as const, amount: "35", unit: "ml" as const, brand: null, sortOrder: 0 },
        { ingredientName: "Passionfruit Puree", ingredientCategory: "puree" as const, amount: "25", unit: "ml" as const, brand: "Boiron", sortOrder: 1 },
        { ingredientName: "Gomme", ingredientCategory: "syrup" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 2 },
        { ingredientName: "Lemon", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: "Boiron", sortOrder: 3 },
        { ingredientName: "Pineapple Juice", ingredientCategory: "juice" as const, amount: "75", unit: "ml" as const, brand: null, sortOrder: 4 },
      ],
      garnishes: [
        { garnishName: "Passionfruit Quarter (float)", garnishCategory: "fruit" as const, quantity: "0.25", quantityUnit: "whole", sortOrder: 0 },
        { garnishName: "Pineapple Leaf", garnishCategory: "botanical" as const, quantity: "1", quantityUnit: "piece", sortOrder: 1 },
        { garnishName: "Edible Gold Duster Spray", garnishCategory: "spray" as const, quantity: "1", quantityUnit: "spray", sortOrder: 2 },
      ],
    },
    {
      name: "Wellingtons Gin Club",
      defaultMenuName: "Wellingtons Gin Club",
      defaultMenuDescription:
        "Gin, raspberry, mint, freshly squeezed lemon & elderflower",
      season: "all_year" as const,
      glassType: "coupe" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      straw: false,
      category: "Signature",
      isNonAlcoholic: false,
      notes: "Sister recipe of Springtime Clover Club (35ml gin vs 25ml).",
      ingredients: [
        { ingredientName: "Gin", ingredientCategory: "spirit" as const, amount: "35", unit: "ml" as const, brand: null, sortOrder: 0 },
        { ingredientName: "Raspberry Puree", ingredientCategory: "puree" as const, amount: "25", unit: "ml" as const, brand: "Boiron", sortOrder: 1 },
        { ingredientName: "Lemon", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: "Boiron", sortOrder: 2 },
        { ingredientName: "Gomme", ingredientCategory: "syrup" as const, amount: "10", unit: "ml" as const, brand: null, sortOrder: 3 },
        { ingredientName: "Elderflower Cordial", ingredientCategory: "modifier" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 4 },
        { ingredientName: "Miraculous Foamer", ingredientCategory: "foamer" as const, amount: "3", unit: "drops" as const, brand: null, sortOrder: 5 },
      ],
      garnishes: [
        { garnishName: "Fresh Raspberry", garnishCategory: "fruit" as const, quantity: "2", quantityUnit: "piece", sortOrder: 0 },
        { garnishName: "Mint Sprig", garnishCategory: "botanical" as const, quantity: "1", quantityUnit: "sprig", sortOrder: 1 },
        { garnishName: "Bamboo Spear", garnishCategory: "decorative" as const, quantity: "1", quantityUnit: "piece", sortOrder: 2 },
      ],
    },
    {
      name: "Clockwork Orange Margarita",
      defaultMenuName: "Clockwork Orange Margarita",
      defaultMenuDescription:
        "Tequila, triple sec, mango, freshly squeezed lime, orange blossom, agave & hibiscus rim",
      season: "all_year" as const,
      glassType: "coupe" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      straw: false,
      category: "Signature",
      isNonAlcoholic: false,
      notes: "Source menu description mentions 'orange blossom' but spec has no orange blossom water — seeded as listed in spec. Flag in gap report.",
      ingredients: [
        { ingredientName: "Tequila Blanco", ingredientCategory: "spirit" as const, amount: "25", unit: "ml" as const, brand: null, sortOrder: 0 },
        { ingredientName: "Triple Sec", ingredientCategory: "modifier" as const, amount: "25", unit: "ml" as const, brand: null, sortOrder: 1 },
        { ingredientName: "Mango Puree", ingredientCategory: "puree" as const, amount: "25", unit: "ml" as const, brand: "Boiron", sortOrder: 2 },
        { ingredientName: "Lime", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: "Boiron", sortOrder: 3 },
        { ingredientName: "Agave Syrup", ingredientCategory: "syrup" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 4 },
        { ingredientName: "Orange Juice", ingredientCategory: "juice" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 5 },
      ],
      garnishes: [
        { garnishName: "Hibiscus Powder Rim", garnishCategory: "decorative" as const, quantity: "1", quantityUnit: "rim", sortOrder: 0 },
        { garnishName: "Mango Spike", garnishCategory: "fruit" as const, quantity: "1", quantityUnit: "piece", sortOrder: 1 },
        { garnishName: "Purple Petal", garnishCategory: "decorative" as const, quantity: "1", quantityUnit: "petal", sortOrder: 2 },
        { garnishName: "Mini Peg", garnishCategory: "decorative" as const, quantity: "1", quantityUnit: "piece", sortOrder: 3 },
      ],
    },
  ];
```

- [ ] **Step 2: Capture cocktail IDs by name so events can reference them**

The existing loop (around line 233-260) processes `cocktailData` and inserts ingredients + garnishes. **Modify the loop** to also build a Map of name → id so subsequent event seeding can look up cocktail IDs.

Find this block:

```ts
  for (const c of cocktailData) {
    const { ingredients, garnishes, ...cocktailRow } = c;

    const [inserted] = await db
      .insert(cocktails)
      .values(cocktailRow)
      .returning({ id: cocktails.id });
```

Replace it with:

```ts
  const cocktailIdByName = new Map<string, string>();
  for (const c of cocktailData) {
    const { ingredients, garnishes, ...cocktailRow } = c;

    const [inserted] = await db
      .insert(cocktails)
      .values(cocktailRow)
      .returning({ id: cocktails.id });

    cocktailIdByName.set(c.name, inserted.id);
```

The rest of the loop (inserts ingredients/garnishes, prints `✓ ${c.name}`) stays unchanged. `cocktailIdByName` is referenced in Task 5 + Task 6.

- [ ] **Step 3: Run seed and verify**

```bash
npm run seed
```

Expected output includes (after cleanup, users, then cocktails):
```
Seeding cocktails...
  ✓ Spiced Passionstar
  ✓ Springtime Clover Club
  ✓ Clydeport Celebration
  ✓ Barrowlands Stars
  ✓ Wellingtons Gin Club
  ✓ Clockwork Orange Margarita
```

No errors.

- [ ] **Step 4: Run existing test suite to confirm nothing broke**

```bash
npm run test
```

Expected: all tests pass. The schema tests don't depend on cocktail data content; they only check column existence.

- [ ] **Step 5: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): replace placeholder cocktails with 6 real signature recipes

Sourced from Heathrow (Spiced Passionstar, Springtime Clover Club)
and Glasgow (Clydeport Celebration, Barrowlands Stars, Wellingtons
Gin Club, Clockwork Orange Margarita) event PDFs.

Closes the open TODO 'Get Murdo's cocktail recipes'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Seed Heathrow event with all relations

**Files:**
- Modify: `src/db/seed.ts`

Insert the Heathrow event followed by its `eventContacts`, `eventCocktails`, `eventEquipment`, and `eventStandardNotes` rows. Murdo's user ID is needed for `createdBy`.

- [ ] **Step 1: Capture Murdo's user ID from existing user seed**

In `src/db/seed.ts`, find the existing users seed block:

```ts
  await db
    .insert(users)
    .values([
      { email: "murdo@bar-excellence.app", name: "Murdo", role: "owner" },
      { email: "rob@roberthayford.com", name: "Rob", role: "super_admin" },
      { email: "rory@lc-group.com", name: "Rory", role: "partner" },
    ])
    .onConflictDoNothing();
```

Replace it with a version that captures the inserted IDs:

```ts
  const insertedUsers = await db
    .insert(users)
    .values([
      { email: "murdo@bar-excellence.app", name: "Murdo", role: "owner" },
      { email: "rob@roberthayford.com", name: "Rob", role: "super_admin" },
      { email: "rory@lc-group.com", name: "Rory", role: "partner" },
    ])
    .onConflictDoNothing()
    .returning({ id: users.id, email: users.email });

  const userIdByEmail = new Map(insertedUsers.map((u) => [u.email, u.id]));
  const murdoId = userIdByEmail.get("murdo@bar-excellence.app")!;
```

Note: if `onConflictDoNothing()` returns nothing on re-run, `userIdByEmail` will be empty. Since Task 1's cleanup does NOT delete users, on re-runs `insertedUsers` will be empty and `murdoId` will be undefined. **Add a fallback lookup** by changing the next line to:

```ts
  const insertedUsers = await db
    .insert(users)
    .values([
      { email: "murdo@bar-excellence.app", name: "Murdo", role: "owner" },
      { email: "rob@roberthayford.com", name: "Rob", role: "super_admin" },
      { email: "rory@lc-group.com", name: "Rory", role: "partner" },
    ])
    .onConflictDoNothing()
    .returning({ id: users.id, email: users.email });

  // On re-runs onConflictDoNothing returns []. Fetch existing rows instead.
  const allUsers = insertedUsers.length
    ? insertedUsers
    : await db.select({ id: users.id, email: users.email }).from(users);
  const userIdByEmail = new Map(allUsers.map((u) => [u.email, u.id]));
  const murdoId = userIdByEmail.get("murdo@bar-excellence.app")!;
```

- [ ] **Step 2: Add Heathrow event block at the end of seed.ts**

After the equipment templates block (after the `for (const tmpl of equipmentTemplatesData)` loop closes) and before `console.log("\nSeed complete!");`, add:

```ts
  // ── Events ─────────────────────────────────────────
  console.log("Seeding events...");

  // ── Event 1: Heathrow Masterclass ──
  const [heathrow] = await db
    .insert(events)
    .values({
      createdBy: murdoId,
      eventName: "Hexaware Cocktail Masterclass",
      eventDate: "2026-05-15",
      arriveTime: "16:00:00",
      setupDeadline: "18:45:00",
      serviceStart: "19:15:00",
      serviceEnd: "20:15:00",
      departTime: "20:30:00",
      // WORKAROUND[address]: full address jammed into venueName (no multi-line address fields)
      venueName:
        "London Hilton Heathrow Airport Terminal 5, Poole Rd, Colnbrook, Heathrow, SL3 0FF",
      venueHallRoom: "Conference room",
      guestCount: 130,
      eventType: "masterclass",
      serviceType: "cocktails_mocktails",
      prepaidServes: 260,
      stationCount: 13,
      stationLayoutNotes:
        "13 tables of 10 guests. Each table: 8 glass bottles + foamer + garnishes + ice bucket + scoop + pre-cut garnish plate.",
      staffCount: 4,
      // WORKAROUND[host]: no host/lead flag — host noted inline
      staffNames: "Murdo MacLeod (host); LC supplies 4 cocktail bartenders",
      installInstructions:
        "Trolley required. Sealed boxes only — no bags or open boxes. Meet Murdo at hotel loading bay at 16:00. Setup complete by 18:45 for 19:15 guest arrival.",
      status: "delivered",
      notesCustom: [
        "60-minute masterclass format, 2 cocktails per guest (one of each menu item).",
        "",
        "WORKAROUND[substitution-stock]: Substitution stock not in any recipe — 4 bottles non-alcoholic gin, 4 bottles non-alcoholic spiced rum (Captain Morgan Non Alco Spiced recommended).",
        "",
        "WORKAROUND[per-station-stock]: Per-table consumables not in per-serve calculator — 13 packs edible gold duster spray, 13 bottles miraculous foamer.",
      ].join("\n"),
      lcRecipient: "Rory",
    })
    .returning({ id: events.id });

  await db.insert(eventContacts).values([
    {
      eventId: heathrow.id,
      contactName: "Murdo MacLeod",
      contactRole: "Host (Bar Excellence)",
      contactPhone: "07882084422",
      isPrimary: true,
      sortOrder: 0,
    },
    {
      eventId: heathrow.id,
      contactName: "Nafisa Ali",
      contactRole: "Venue",
      contactEmail: "nafisa.ali@hilton.com",
      sortOrder: 1,
    },
    {
      eventId: heathrow.id,
      contactName: "Prakharg Ghildyal",
      contactRole: "Client (Hexaware)",
      contactPhone: "+447776651243",
      contactEmail: "prakharg@hexaware.com",
      sortOrder: 2,
    },
  ]);

  await db.insert(eventCocktails).values([
    {
      eventId: heathrow.id,
      cocktailId: cocktailIdByName.get("Spiced Passionstar")!,
      menuName: "Spiced Passionstar",
      menuDescription:
        "Spiced rum, passionfruit, freshly squeezed lemon, pineapple & glistening with edible glitter",
      servesAllocated: 130,
      sortOrder: 0,
    },
    {
      eventId: heathrow.id,
      cocktailId: cocktailIdByName.get("Springtime Clover Club")!,
      menuName: "Springtime Clover Club",
      menuDescription:
        "Gin, raspberries, mint, freshly squeezed lemon, elderflower & cloudy apple",
      servesAllocated: 130,
      sortOrder: 1,
    },
  ]);

  // WORKAROUND[per-guest-equipment]: 140 rocks/coupes/shakers = 130 guests + 10 spare.
  // No per_guest scaling rule in the enum, so all entered as fixed quantities.
  // WORKAROUND[plastic-box-qty]: PDF doesn't specify count for plastic boxes — picked 6 as judgement call.
  await db.insert(eventEquipment).values([
    { eventId: heathrow.id, itemName: "Glass bottles (labelled, on tables)", quantity: 110, isFromTemplate: false, sortOrder: 0 },
    { eventId: heathrow.id, itemName: "Pens for labels", quantity: 4, isFromTemplate: false, sortOrder: 1 },
    { eventId: heathrow.id, itemName: "Sticky labels (pack)", quantity: 1, isFromTemplate: false, sortOrder: 2 },
    { eventId: heathrow.id, itemName: "Ice bucket", quantity: 13, isFromTemplate: true, sortOrder: 3 },
    { eventId: heathrow.id, itemName: "Ice scoop", quantity: 13, isFromTemplate: true, sortOrder: 4 },
    { eventId: heathrow.id, itemName: "Fruit plate", quantity: 13, isFromTemplate: true, sortOrder: 5 },
    { eventId: heathrow.id, itemName: "Fruit knife", quantity: 3, isFromTemplate: false, sortOrder: 6 },
    { eventId: heathrow.id, itemName: "Chopping board", quantity: 3, isFromTemplate: false, sortOrder: 7 },
    { eventId: heathrow.id, itemName: "Rocks glass", quantity: 140, isFromTemplate: false, sortOrder: 8 },
    { eventId: heathrow.id, itemName: "Coupe glass", quantity: 140, isFromTemplate: false, sortOrder: 9 },
    { eventId: heathrow.id, itemName: "Plastic shaker (3-piece)", quantity: 140, isFromTemplate: false, sortOrder: 10 },
    { eventId: heathrow.id, itemName: "Brush and dustpan", quantity: 1, isFromTemplate: true, sortOrder: 11 },
    { eventId: heathrow.id, itemName: "Trolley", quantity: 1, isFromTemplate: false, sortOrder: 12 },
    { eventId: heathrow.id, itemName: "Large plastic box with lid", quantity: 6, isFromTemplate: false, sortOrder: 13 },
  ]);

  await db.insert(eventStandardNotes).values([
    { eventId: heathrow.id, noteId: noteIdByLabel.get("Attire")!, sortOrder: 0 },
    { eventId: heathrow.id, noteId: noteIdByLabel.get("Problem Escalation")!, sortOrder: 1 },
    { eventId: heathrow.id, noteId: noteIdByLabel.get("Stock Movement")!, sortOrder: 2 },
    { eventId: heathrow.id, noteId: noteIdByLabel.get("On-Site Washing")!, sortOrder: 3 },
  ]);

  console.log("  ✓ Heathrow Masterclass (2026-05-15)");
```

- [ ] **Step 3: Run seed and verify**

```bash
npm run seed
```

Expected: previous output, then:
```
Seeding events...
  ✓ Heathrow Masterclass (2026-05-15)
```

No errors. If `userIdByEmail.get(...)` returns undefined, the run will fail with `null value in column "created_by"` or a TypeScript error — check Step 1's fallback logic.

- [ ] **Step 4: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): add Heathrow masterclass event with contacts, cocktails, equipment, notes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Seed Glasgow event with all relations

**Files:**
- Modify: `src/db/seed.ts`

Same pattern as Task 5. Glasgow has 4 cocktails, 2 contacts, pop-up bar, branding workaround.

- [ ] **Step 1: Add Glasgow event block immediately after the Heathrow block**

In `src/db/seed.ts`, after the Heathrow `console.log("  ✓ Heathrow Masterclass (2026-05-15)");` line, add:

```ts
  // ── Event 2: Glasgow Pinsent Masons ──
  const [glasgow] = await db
    .insert(events)
    .values({
      createdBy: murdoId,
      eventName: "Pinsent Masons Office Social",
      eventDate: "2026-04-23",
      arriveTime: "15:00:00",
      setupDeadline: "17:00:00",
      serviceStart: "18:00:00",
      serviceEnd: "21:00:00",
      departTime: "21:30:00",
      // WORKAROUND[address]: full address + caterer jammed into venueName
      venueName:
        "Aurora @ Pinsent Masons (catered by Lexington Catering), 120 Bothwell Street, Glasgow, G2 7JS",
      venueHallRoom: "Aurora",
      guestCount: 100,
      eventType: "drinks_reception",
      serviceType: "cocktails_mocktails",
      prepaidServes: 200,
      stationCount: 3,
      stationLayoutNotes:
        "3 bartender stations on a 3m curved pop-up bar. 40 cocktails pre-poured on bar top at 17:45 (10 of each of 4 types). All stock and glassware hidden behind bar throughout.",
      staffCount: 3,
      // WORKAROUND[host]: no host/lead flag — host noted inline
      staffNames: "Murdo MacLeod (host); James McClymont; 3 LC bartenders",
      popUpBar: true,
      // WORKAROUND[branding]: branding text shoehorned into supplier field
      popUpBarSupplier: "3m curved, vinyl banner front branding attached seamlessly",
      installInstructions:
        "Meet Murdo outside the building at 15:00. Bar in place first, vinyl attached seamlessly. All stock/glassware hidden behind bar out of sight. Loading bay access TBC (updated Tuesday before event).",
      status: "delivered",
      notesCustom: [
        "WORKAROUND[pre-pour-batching]: Pre-pour 40 cocktails on bar top at 17:45 (10 of each of 4 types). Bar top must be clean and beautiful throughout service.",
        "",
        "Glasses to be collected from floor and returned to bar throughout service.",
        "",
        "WORKAROUND[substitution-stock]: Substitution stock — 1 bottle each: non-alc scotch whisky, non-alc gin, non-alc spiced rum, non-alc agave spirit.",
        "",
        "WORKAROUND[ice-types]: Two ice types in same event — Cubed 30kg + Crushed 10kg. Stock calculator may aggregate both as 'g'.",
        "",
        "Venue also serves wine + champagne from a separate bar (not our responsibility).",
      ].join("\n"),
      lcRecipient: "Rory",
    })
    .returning({ id: events.id });

  await db.insert(eventContacts).values([
    {
      eventId: glasgow.id,
      contactName: "Murdo MacLeod",
      contactRole: "Host (Bar Excellence)",
      contactPhone: "07882084422",
      isPrimary: true,
      sortOrder: 0,
    },
    {
      eventId: glasgow.id,
      contactName: "James McClymont",
      contactPhone: "07916857416",
      sortOrder: 1,
    },
  ]);

  await db.insert(eventCocktails).values([
    {
      eventId: glasgow.id,
      cocktailId: cocktailIdByName.get("Clydeport Celebration")!,
      menuName: "Clydeport Celebration",
      menuDescription:
        "Drambuie, freshly squeezed lemon, cloudy apple & citrus foam, garnished with heather",
      servesAllocated: 50,
      sortOrder: 0,
    },
    {
      eventId: glasgow.id,
      cocktailId: cocktailIdByName.get("Wellingtons Gin Club")!,
      menuName: "Wellingtons Gin Club",
      menuDescription: "Gin, raspberry, mint, freshly squeezed lemon & elderflower",
      servesAllocated: 50,
      sortOrder: 1,
    },
    {
      eventId: glasgow.id,
      cocktailId: cocktailIdByName.get("Barrowlands Stars")!,
      menuName: "Barrowlands Stars",
      menuDescription:
        "Spiced rum, passionfruit, freshly squeezed lemon & pineapple, with edible gold dust",
      servesAllocated: 50,
      sortOrder: 2,
    },
    {
      eventId: glasgow.id,
      cocktailId: cocktailIdByName.get("Clockwork Orange Margarita")!,
      menuName: "Clockwork Orange Margarita",
      menuDescription:
        "Tequila, triple sec, mango, freshly squeezed lime, orange blossom, agave & hibiscus rim",
      servesAllocated: 50,
      sortOrder: 3,
    },
  ]);

  // WORKAROUND[per-guest-equipment]: 100 rocks/coupes = exact guest count.
  await db.insert(eventEquipment).values([
    { eventId: glasgow.id, itemName: "Etched rocks glass", quantity: 100, isFromTemplate: false, sortOrder: 0 },
    { eventId: glasgow.id, itemName: "Coupe glass", quantity: 100, isFromTemplate: false, sortOrder: 1 },
    { eventId: glasgow.id, itemName: "Bin (back of bar)", quantity: 2, isFromTemplate: true, sortOrder: 2 },
    { eventId: glasgow.id, itemName: "Bin liners (pack)", quantity: 1, isFromTemplate: true, sortOrder: 3 },
    { eventId: glasgow.id, itemName: "Ice bucket", quantity: 3, isFromTemplate: true, sortOrder: 4 },
    { eventId: glasgow.id, itemName: "Ice scoop", quantity: 3, isFromTemplate: true, sortOrder: 5 },
    { eventId: glasgow.id, itemName: "Large box (cubed ice)", quantity: 1, isFromTemplate: false, sortOrder: 6 },
    { eventId: glasgow.id, itemName: "Large box (crushed ice)", quantity: 1, isFromTemplate: false, sortOrder: 7 },
    { eventId: glasgow.id, itemName: "Bartender kit (full set: speedpours, knives, boards, shakers, hawthorns, fine strainers, squeeze bottles, bar spoons)", quantity: 3, isFromTemplate: false, sortOrder: 8 },
    { eventId: glasgow.id, itemName: "First aid kit", quantity: 1, isFromTemplate: true, sortOrder: 9 },
    { eventId: glasgow.id, itemName: "Brush and dustpan", quantity: 1, isFromTemplate: true, sortOrder: 10 },
    { eventId: glasgow.id, itemName: "Menu in holder", quantity: 1, isFromTemplate: true, sortOrder: 11 },
  ]);

  await db.insert(eventStandardNotes).values([
    { eventId: glasgow.id, noteId: noteIdByLabel.get("Attire")!, sortOrder: 0 },
    { eventId: glasgow.id, noteId: noteIdByLabel.get("Problem Escalation")!, sortOrder: 1 },
    { eventId: glasgow.id, noteId: noteIdByLabel.get("Stock Movement")!, sortOrder: 2 },
    { eventId: glasgow.id, noteId: noteIdByLabel.get("On-Site Washing")!, sortOrder: 3 },
  ]);

  console.log("  ✓ Pinsent Masons Office Social (2026-04-23)");
```

- [ ] **Step 2: Run seed and verify both events**

```bash
npm run seed
```

Expected output includes both events:
```
Seeding events...
  ✓ Heathrow Masterclass (2026-05-15)
  ✓ Pinsent Masons Office Social (2026-04-23)

Seed complete!
```

No errors.

- [ ] **Step 3: Run test suite + build to confirm nothing broke**

```bash
npm run test
npm run build
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): add Glasgow Pinsent Masons event with contacts, 4 cocktails, equipment, notes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Strike completed TODO and commit

**Files:**
- Modify: `TODOS.md`

The "Get Murdo's cocktail recipes" task is now done (6 real recipes seeded).

- [ ] **Step 1: Mark the cocktail recipes TODO as done in TODOS.md**

In `TODOS.md`, find the block:

```markdown
### Get Murdo's cocktail recipes
**What:** Collect ~20 cocktail recipes in spreadsheet format (name, ingredients with exact measurements, garnishes). Replace the seeded placeholder cocktails.
**Why:** Stock calculator depends on accurate recipe data.
**Depends on:** Murdo providing the data.
**Added:** 2026-04-16
```

Replace it with:

```markdown
### Get Murdo's cocktail recipes ✓ partial (6 of ~20)
**What:** Collect ~20 cocktail recipes in spreadsheet format (name, ingredients with exact measurements, garnishes). Replace the seeded placeholder cocktails.
**Why:** Stock calculator depends on accurate recipe data.
**Status:** 6 real recipes seeded from Heathrow + Glasgow PDFs (Spiced Passionstar, Springtime Clover Club, Clydeport Celebration, Barrowlands Stars, Wellingtons Gin Club, Clockwork Orange Margarita). Placeholder cocktails removed. ~14 more recipes still pending from Murdo.
**Added:** 2026-04-16
**Updated:** 2026-05-18
```

- [ ] **Step 2: Commit**

```bash
git add TODOS.md
git commit -m "docs(todos): mark cocktail recipes TODO partial (6 of ~20 seeded)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Walk Heathrow event in the UI and capture findings

**Files:**
- (no files modified yet — this is data collection for Task 10)

This is a manual UI walk, not a code change. Capture findings in scratch notes for the gap report.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Expected: server starts at http://localhost:3000.

- [ ] **Step 2: Sign in as Murdo via test-signin route**

Open `http://localhost:3000/test-signin?email=murdo@bar-excellence.app` (the test-signin route is gated by `ENABLE_TEST_AUTH=true` per CLAUDE.md). If that env var isn't set locally, sign in via magic link instead.

Expected: redirects to dashboard, signed in as Murdo (owner role).

- [ ] **Step 3: Open the Heathrow event in the UI**

Navigate to `/events`, find "Hexaware Cocktail Masterclass", open it. Walk every tab: Overview, Cocktails, Stock, Kit, Notes, Checklist.

For each tab, compare against the source PDF (`~/Downloads/Heathrow Event Sheet PDF.pdf`). Note:
- What's rendered correctly
- What's missing
- What's wrong
- Which workaround tag (`WORKAROUND[...]`) caused the gap

- [ ] **Step 4: Generate the event sheet (HTML/PDF download)**

From the event detail page, trigger "Send to LC" preview / "Download PDF" / whatever the equivalent UI affordance is. Compare the generated event sheet output to the source PDF page-by-page.

- [ ] **Step 5: Save findings as scratch notes**

Don't write the gap report yet — just keep a scratch file at `/tmp/heathrow-gaps.md` (or in a sticky note) per section:
- Header / metadata
- Service summary
- Cocktails + recipes
- Stock list (calculator output)
- Kit list
- Standard notes
- Custom notes / workarounds
- Contacts

Each finding tagged severity: `blocker` / `nice-to-have` / `accepted`.

---

## Task 9: Walk Glasgow event in the UI and capture findings

**Files:**
- (no files modified yet)

Same procedure as Task 8 against the Glasgow event and `~/Downloads/Brief Sheet 23rd April - Glasgow (PDF).pdf`.

- [ ] **Step 1: Open Glasgow event**

Navigate to `/events`, open "Pinsent Masons Office Social".

- [ ] **Step 2: Walk all tabs + generate event sheet**

Same tab walk + side-by-side as Task 8.

- [ ] **Step 3: Save findings**

Append to `/tmp/glasgow-gaps.md` or equivalent scratch.

Key things to focus on (specific to Glasgow that Heathrow didn't test):
- Pop-up bar branding text in `popUpBarSupplier`
- Two ice types — does stock calculator aggregate them weirdly?
- 4 cocktails on one event (Heathrow only had 2)
- Categorized stock list — does the rendered output group spirits / juices / purees / etc.?
- Pre-pour batching note rendering

---

## Task 10: Write the gap report

**Files:**
- Create: `docs/plans/2026-05-18-event-sheet-gap-report.md`

Consolidate the Task 8 + Task 9 findings into a single structured report.

- [ ] **Step 1: Create the gap report file**

Write `docs/plans/2026-05-18-event-sheet-gap-report.md` with this exact skeleton (fill in real findings from Tasks 8 + 9):

```markdown
# Event Sheet Gap Report — Heathrow + Glasgow

**Date:** 2026-05-18
**Source PDFs:** Heathrow Event Sheet (2026-05-15), Brief Sheet 23rd April Glasgow (2026-04-23)
**Spec:** `docs/superpowers/specs/2026-05-18-real-event-seed-and-gap-report-design.md`

## Method

Seeded both events end-to-end into the local DB via `npm run seed`. Opened each event in the UI (signed in as Murdo / owner), walked every tab, and generated the event sheet (HTML/PDF). Compared section-by-section to the original PDFs.

Severity:
- **Blocker** — Murdo cannot produce a usable event sheet without manual editing.
- **Nice-to-have** — Workaround is visible in the rendered sheet (e.g. address jammed into one line).
- **Accepted** — Workaround is invisible to LC.

---

## Event: Heathrow Masterclass

### Section: Header / metadata
- ✓ Match: <list>
- ✗ Gap: <list, with severity tag and WORKAROUND[id] reference>

### Section: Service summary
- ...

### Section: Cocktails + recipes
- ...

### Section: Stock list (calculator output)
- ...

### Section: Kit list
- ...

### Section: Standard notes
- ...

### Section: Custom notes / workarounds
- ...

### Section: Contacts
- ...

---

## Event: Glasgow Pinsent Masons

[Same section structure as Heathrow]

---

## Severity tally

| Severity | Count | IDs |
|---|---|---|
| Blocker | N | ... |
| Nice-to-have | N | ... |
| Accepted | N | ... |

## Workaround tags observed

For each `WORKAROUND[id]` tag found in seed.ts, summarise impact:

| ID | Impact in rendered sheet | Severity |
|---|---|---|
| `address` | ... | ... |
| `host` | ... | ... |
| `branding` | ... | ... |
| `per-guest-equipment` | ... | ... |
| `per-station-stock` | ... | ... |
| `substitution-stock` | ... | ... |
| `pre-pour-batching` | ... | ... |
| `ice-types` | ... | ... |
| `tbc-fields` | ... | ... |
| `plastic-box-qty` | ... | ... |

## Recommended follow-up specs

Group related gaps into the smallest sensible specs:

- **Spec A: <name>** — closes <list of gap IDs>. Estimated scope: <S/M/L>.
- **Spec B: ...**

## Source PDF discrepancies noted in cocktail recipes

(For Murdo to confirm before any further seeding.)

- **Springtime Clover Club / Wellingtons Gin Club** — menu description mentions "cloudy apple" but spec has no apple juice. Seeded without.
- **Clockwork Orange Margarita** — menu description mentions "orange blossom" but spec has agave + OJ only. Seeded without orange blossom.
- **Clydeport Celebration** — Gomme amount flagged "(check)" in source spec. Seeded at 10ml.
```

- [ ] **Step 2: Fill in real findings from Tasks 8 + 9 scratch notes**

Convert each scratch-note finding into a bullet under the appropriate section. Tag every gap with severity + `WORKAROUND[id]` where applicable. The "Severity tally" and "Workaround tags" tables get filled in from those bullets.

- [ ] **Step 3: Write the "Recommended follow-up specs" section**

Cluster related gaps. Suggested starting points based on the spec's "What this spec does NOT decide" list:
- Per-station + per-guest scaling rules (combine in one schema spec)
- Substitution stock model + ice types (consumables refactor spec)
- Address + host + branding fields (event metadata polish spec)
- Stock calculator per-station awareness (calculator spec, depends on scaling rules)
- Stock list category grouping in render (UI-only spec)

Final clustering should be driven by what the report actually found.

- [ ] **Step 4: Commit the gap report**

```bash
git add docs/plans/2026-05-18-event-sheet-gap-report.md
git commit -m "docs(plan): event sheet gap report (Heathrow + Glasgow vs schema)

Compares rendered event sheet against original PDFs for both seeded
events. Tallies severity, summarises WORKAROUND[id] impact, and
recommends follow-up schema specs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Done

After Task 10 commits, this plan is complete. The deliverables:

1. ✓ 6 real cocktails seeded (closing partial of TODO)
2. ✓ 4 reusable standard notes seeded
3. ✓ 2 equipment templates seeded
4. ✓ Heathrow event + relations seeded
5. ✓ Glasgow event + relations seeded
6. ✓ Gap report written, ready to drive the next round of schema specs

Next step (out of scope for this plan): pick the highest-priority cluster from the gap report's "Recommended follow-up specs" and brainstorm a new spec for it.
