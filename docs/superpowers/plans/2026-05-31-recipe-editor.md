# Recipe Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give owner/super_admin full in-app CRUD for the cocktail recipe library — create, edit, duplicate, and archive recipes with ingredients, garnishes, ice/straw details, and a Vercel Blob reference image.

**Architecture:** Mirror the existing events pattern — dedicated routes (`/recipes/new`, `/recipes/[id]/edit`) rendering a shared `<RecipeForm>`, backed by server actions in `src/actions/recipes.ts`. Pure validation lives in `src/lib/recipe-validation.ts` (TDD). Reference images upload client-side to Vercel Blob via a token route. Soft archive (`isActive=false`) preserves history.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM (neon-http, no transactions), Tailwind v4 (Reserve Noir), Vercel Blob (`@vercel/blob` ^2.3.3), Vitest, Playwright.

**Reference patterns (read before starting):**
- Form: `src/components/events/event-form.tsx` (FormField/TextArea, `errors: string[]`, gold-ink submit)
- Validation: `src/lib/recipe-validation` mirrors `src/lib/recipient-validation.ts`
- Role gating page: `src/app/(authenticated)/settings/page.tsx`
- Existing actions: `src/actions/recipes.ts` (currently `listRecipes`, `getRecipe`)
- Enums live in `src/db/schema.ts` (seasonEnum, glassTypeEnum, ingredientCategoryEnum, ingredientUnitEnum, garnishCategoryEnum)

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/recipe-validation.ts` (create) | Pure `validateRecipeInput(input): string[]` + shared `RecipeInput` types |
| `src/lib/recipe-validation.test.ts` (create) | Unit tests (TDD) |
| `src/actions/recipes.ts` (modify) | Add `createRecipe`, `updateRecipe`, `archiveRecipe`, `duplicateRecipe` |
| `src/app/api/recipes/upload/route.ts` (create) | Vercel Blob client-upload token route (role-gated) |
| `src/components/recipes/image-uploader.tsx` (create) | Blob client upload + preview/remove |
| `src/components/recipes/recipe-form.tsx` (create) | Main form: core fields + dynamic ingredient/garnish rows |
| `src/components/recipes/recipe-actions.tsx` (create) | Duplicate/Archive buttons (client) |
| `src/app/(authenticated)/recipes/new/page.tsx` (create) | Create route (role-gated) |
| `src/app/(authenticated)/recipes/[id]/edit/page.tsx` (create) | Edit route (role-gated) |
| `src/app/(authenticated)/recipes/page.tsx` (modify) | "New recipe" CTA (role-gated) |
| `src/app/(authenticated)/recipes/[id]/page.tsx` (modify) | Edit/Duplicate/Archive affordances (role-gated) |
| `.env.example` (modify) | Document `BLOB_READ_WRITE_TOKEN` |
| `docs/production-setup.md` (modify) | Add `BLOB_READ_WRITE_TOKEN` to env table |
| `e2e/recipe-editor.spec.ts` (create) | End-to-end coverage |
| `CLAUDE.md` (modify) | Document the recipe-editor feature |

**Note:** `getAvailableCocktails()` (`src/actions/event-cocktails.ts:122`) already filters `isActive=true`, so archived recipes are already excluded from the event picker. No change needed there — Task 7 only verifies it.

---

## Task 1: Recipe validation library (TDD)

**Files:**
- Create: `src/lib/recipe-validation.ts`
- Test: `src/lib/recipe-validation.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/recipe-validation.test.ts
import { describe, it, expect } from "vitest";
import { validateRecipeInput, type RecipeInput } from "./recipe-validation";

function base(): RecipeInput {
  return {
    name: "Spiced Passionstar",
    defaultMenuName: "Spiced Passionstar",
    defaultMenuDescription: null,
    season: "all_year",
    glassType: "rocks",
    category: "Signature",
    iceType: "Cubed",
    iceAmountG: 200,
    straw: true,
    strawType: "Black short cardboard",
    isNonAlcoholic: false,
    notes: null,
    referenceImageUrl: null,
    ingredients: [
      {
        ingredientName: "Spiced Rum",
        ingredientCategory: "spirit",
        amount: "25",
        unit: "ml",
        brand: null,
        isOptional: false,
      },
    ],
    garnishes: [
      {
        garnishName: "Pineapple Leaf",
        garnishCategory: "botanical",
        quantity: "1",
        quantityUnit: "piece",
      },
    ],
  };
}

describe("validateRecipeInput", () => {
  it("accepts a valid recipe", () => {
    expect(validateRecipeInput(base())).toEqual([]);
  });

  it("requires a name", () => {
    const errs = validateRecipeInput({ ...base(), name: "   " });
    expect(errs).toContain("Recipe name is required");
  });

  it("requires a default menu name", () => {
    const errs = validateRecipeInput({ ...base(), defaultMenuName: "" });
    expect(errs).toContain("Menu name is required");
  });

  it("requires at least one ingredient", () => {
    const errs = validateRecipeInput({ ...base(), ingredients: [] });
    expect(errs).toContain("At least one ingredient is required");
  });

  it("rejects an ingredient with a blank name", () => {
    const input = base();
    input.ingredients[0].ingredientName = "";
    expect(validateRecipeInput(input)).toContain(
      "Ingredient 1: name is required"
    );
  });

  it("rejects a non-numeric ingredient amount", () => {
    const input = base();
    input.ingredients[0].amount = "lots";
    expect(validateRecipeInput(input)).toContain(
      "Ingredient 1: amount must be a number"
    );
  });

  it("rejects an invalid ingredient unit", () => {
    const input = base();
    input.ingredients[0].unit = "gallons";
    expect(validateRecipeInput(input)).toContain(
      "Ingredient 1: invalid unit"
    );
  });

  it("rejects a non-numeric garnish quantity", () => {
    const input = base();
    input.garnishes[0].quantity = "some";
    expect(validateRecipeInput(input)).toContain(
      "Garnish 1: quantity must be a number"
    );
  });

  it("rejects a negative iceAmountG", () => {
    const errs = validateRecipeInput({ ...base(), iceAmountG: -5 });
    expect(errs).toContain("Ice amount must be a non-negative whole number");
  });

  it("allows garnishes to be empty", () => {
    expect(validateRecipeInput({ ...base(), garnishes: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npm run test -- --run recipe-validation`
Expected: FAIL — `validateRecipeInput`/`recipe-validation` not found.

- [ ] **Step 3: Implement the validation library**

```typescript
// src/lib/recipe-validation.ts

export const INGREDIENT_UNITS = [
  "ml",
  "g",
  "drops",
  "dash",
  "piece",
  "whole",
  "bunch",
  "sprig",
] as const;

export const INGREDIENT_CATEGORIES = [
  "spirit",
  "puree",
  "juice",
  "syrup",
  "citrus",
  "modifier",
  "foamer",
  "soda",
  "other",
] as const;

export const GARNISH_CATEGORIES = [
  "fruit",
  "botanical",
  "decorative",
  "spray",
] as const;

export const SEASONS = [
  "spring",
  "summer",
  "autumn",
  "winter",
  "all_year",
] as const;

export const GLASS_TYPES = [
  "rocks",
  "coupe",
  "highball",
  "martini",
  "flute",
  "polycarb_rocks",
  "other",
] as const;

export type RecipeIngredientInput = {
  ingredientName: string;
  ingredientCategory: string;
  amount: string;
  unit: string;
  brand: string | null;
  isOptional: boolean;
};

export type RecipeGarnishInput = {
  garnishName: string;
  garnishCategory: string;
  quantity: string;
  quantityUnit: string;
};

export type RecipeInput = {
  name: string;
  defaultMenuName: string;
  defaultMenuDescription: string | null;
  season: string;
  glassType: string;
  category: string | null;
  iceType: string | null;
  iceAmountG: number | null;
  straw: boolean;
  strawType: string | null;
  isNonAlcoholic: boolean;
  notes: string | null;
  referenceImageUrl: string | null;
  ingredients: RecipeIngredientInput[];
  garnishes: RecipeGarnishInput[];
};

function isNumeric(value: string): boolean {
  if (value.trim() === "") return false;
  return !Number.isNaN(Number(value));
}

export function validateRecipeInput(input: RecipeInput): string[] {
  const errors: string[] = [];

  if (!input.name?.trim()) errors.push("Recipe name is required");
  if (!input.defaultMenuName?.trim()) errors.push("Menu name is required");

  if (
    input.iceAmountG !== null &&
    (!Number.isInteger(input.iceAmountG) || input.iceAmountG < 0)
  ) {
    errors.push("Ice amount must be a non-negative whole number");
  }

  if (input.ingredients.length === 0) {
    errors.push("At least one ingredient is required");
  }

  input.ingredients.forEach((ing, i) => {
    const n = i + 1;
    if (!ing.ingredientName?.trim()) errors.push(`Ingredient ${n}: name is required`);
    if (!isNumeric(ing.amount)) errors.push(`Ingredient ${n}: amount must be a number`);
    if (!INGREDIENT_UNITS.includes(ing.unit as (typeof INGREDIENT_UNITS)[number])) {
      errors.push(`Ingredient ${n}: invalid unit`);
    }
  });

  input.garnishes.forEach((g, i) => {
    const n = i + 1;
    if (!g.garnishName?.trim()) errors.push(`Garnish ${n}: name is required`);
    if (!isNumeric(g.quantity)) errors.push(`Garnish ${n}: quantity must be a number`);
  });

  return errors;
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npm run test -- --run recipe-validation`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipe-validation.ts src/lib/recipe-validation.test.ts
git commit -m "feat(recipes): add recipe-validation library"
```

---

## Task 2: Recipe mutation server actions

**Files:**
- Modify: `src/actions/recipes.ts`

- [ ] **Step 1: Add the four mutation actions**

Append to `src/actions/recipes.ts` (keep existing imports; add the new ones shown). The file already starts with `"use server";`.

```typescript
// --- add to the import block at the top of src/actions/recipes.ts ---
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  validateRecipeInput,
  type RecipeInput,
} from "@/lib/recipe-validation";

// --- append these actions to src/actions/recipes.ts ---

async function insertChildren(cocktailId: string, input: RecipeInput) {
  if (input.ingredients.length > 0) {
    await db.insert(cocktailIngredients).values(
      input.ingredients.map((ing, i) => ({
        cocktailId,
        ingredientName: ing.ingredientName.trim(),
        ingredientCategory:
          ing.ingredientCategory as (typeof cocktailIngredients.ingredientCategory.enumValues)[number],
        amount: ing.amount,
        unit: ing.unit as (typeof cocktailIngredients.unit.enumValues)[number],
        brand: ing.brand?.trim() || null,
        isOptional: ing.isOptional,
        sortOrder: i,
      }))
    );
  }
  if (input.garnishes.length > 0) {
    await db.insert(cocktailGarnishes).values(
      input.garnishes.map((g, i) => ({
        cocktailId,
        garnishName: g.garnishName.trim(),
        garnishCategory:
          g.garnishCategory as (typeof cocktailGarnishes.garnishCategory.enumValues)[number],
        quantity: g.quantity,
        quantityUnit: g.quantityUnit.trim() || "piece",
        sortOrder: i,
      }))
    );
  }
}

function cocktailRow(input: RecipeInput) {
  return {
    name: input.name.trim(),
    defaultMenuName: input.defaultMenuName.trim(),
    defaultMenuDescription: input.defaultMenuDescription?.trim() || null,
    season: input.season as (typeof cocktails.season.enumValues)[number],
    glassType: input.glassType as (typeof cocktails.glassType.enumValues)[number],
    category: input.category?.trim() || null,
    iceType: input.iceType?.trim() || null,
    iceAmountG: input.iceAmountG,
    straw: input.straw,
    strawType: input.strawType?.trim() || null,
    isNonAlcoholic: input.isNonAlcoholic,
    notes: input.notes?.trim() || null,
    referenceImageUrl: input.referenceImageUrl?.trim() || null,
  };
}

export async function createRecipe(
  input: RecipeInput
): Promise<{ errors: string[] }> {
  await requireRole("owner", "super_admin");

  const errors = validateRecipeInput(input);
  if (errors.length > 0) return { errors };

  const [inserted] = await db
    .insert(cocktails)
    .values(cocktailRow(input))
    .returning({ id: cocktails.id });

  await insertChildren(inserted.id, input);

  revalidatePath("/recipes");
  redirect(`/recipes/${inserted.id}`);
}

export async function updateRecipe(
  id: string,
  input: RecipeInput
): Promise<{ errors: string[] }> {
  await requireRole("owner", "super_admin");

  const errors = validateRecipeInput(input);
  if (errors.length > 0) return { errors };

  await db
    .update(cocktails)
    .set({ ...cocktailRow(input), updatedAt: new Date() })
    .where(eq(cocktails.id, id));

  // neon-http has no transactions: replace children with delete-then-insert.
  await db.delete(cocktailIngredients).where(eq(cocktailIngredients.cocktailId, id));
  await db.delete(cocktailGarnishes).where(eq(cocktailGarnishes.cocktailId, id));
  await insertChildren(id, input);

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

export async function archiveRecipe(id: string): Promise<void> {
  await requireRole("owner", "super_admin");
  await db.update(cocktails).set({ isActive: false }).where(eq(cocktails.id, id));
  revalidatePath("/recipes");
  redirect("/recipes");
}

export async function duplicateRecipe(id: string): Promise<void> {
  await requireRole("owner", "super_admin");

  const source = await getRecipe(id);
  if (!source) redirect("/recipes");

  const [clone] = await db
    .insert(cocktails)
    .values({
      name: `Copy of ${source.name}`,
      defaultMenuName: `Copy of ${source.defaultMenuName}`,
      defaultMenuDescription: source.defaultMenuDescription,
      season: source.season,
      glassType: source.glassType,
      category: source.category,
      iceType: source.iceType,
      iceAmountG: source.iceAmountG,
      straw: source.straw,
      strawType: source.strawType,
      isNonAlcoholic: source.isNonAlcoholic,
      notes: source.notes,
      referenceImageUrl: source.referenceImageUrl,
    })
    .returning({ id: cocktails.id });

  if (source.ingredients.length > 0) {
    await db.insert(cocktailIngredients).values(
      source.ingredients.map((ing) => ({
        cocktailId: clone.id,
        ingredientName: ing.ingredientName,
        ingredientCategory: ing.ingredientCategory,
        amount: ing.amount,
        unit: ing.unit,
        brand: ing.brand,
        isOptional: ing.isOptional,
        sortOrder: ing.sortOrder,
      }))
    );
  }
  if (source.garnishes.length > 0) {
    await db.insert(cocktailGarnishes).values(
      source.garnishes.map((g) => ({
        cocktailId: clone.id,
        garnishName: g.garnishName,
        garnishCategory: g.garnishCategory,
        quantity: g.quantity,
        quantityUnit: g.quantityUnit,
        sortOrder: g.sortOrder,
      }))
    );
  }

  revalidatePath("/recipes");
  redirect(`/recipes/${clone.id}/edit`);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors. (If an enum cast complains, confirm the enum value strings match `src/db/schema.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/actions/recipes.ts
git commit -m "feat(recipes): add create/update/archive/duplicate actions"
```

---

## Task 3: Vercel Blob upload route

**Files:**
- Create: `src/app/api/recipes/upload/route.ts`

- [ ] **Step 1: Implement the token route**

```typescript
// src/app/api/recipes/upload/route.ts
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getSession();
        if (
          !session ||
          (session.role !== "owner" && session.role !== "super_admin")
        ) {
          throw new Error("Unauthorized");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 5 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op: the client persists the returned URL with the recipe form.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/recipes/upload/route.ts
git commit -m "feat(recipes): add Vercel Blob upload token route"
```

---

## Task 4: Image uploader component

**Files:**
- Create: `src/components/recipes/image-uploader.tsx`

- [ ] **Step 1: Implement the uploader**

```tsx
// src/components/recipes/image-uploader.tsx
"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

export function ImageUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/recipes/upload",
      });
      onChange(blob.url);
    } catch (e) {
      setError((e as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mb-1.5">
        Reference image
      </label>

      {value ? (
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Reference"
            className="w-32 h-40 object-cover border border-outline/15"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-error hover:underline min-h-[44px]"
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="w-full px-3 py-6 bg-surface-low border-b-2 border-outline/15 text-grey font-[family-name:var(--font-raleway)] text-sm cursor-pointer hover:border-gold transition-colors duration-200 text-center"
        >
          {uploading ? "Uploading…" : "Click to upload an image (JPG/PNG/WebP, ≤5MB)"}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="mt-2 text-error text-sm font-[family-name:var(--font-raleway)]">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/recipes/image-uploader.tsx
git commit -m "feat(recipes): add Blob image uploader component"
```

---

## Task 5: Recipe form component

**Files:**
- Create: `src/components/recipes/recipe-form.tsx`

- [ ] **Step 1: Implement the form**

```tsx
// src/components/recipes/recipe-form.tsx
"use client";

import { useState } from "react";
import { ImageUploader } from "./image-uploader";
import {
  INGREDIENT_UNITS,
  INGREDIENT_CATEGORIES,
  GARNISH_CATEGORIES,
  SEASONS,
  GLASS_TYPES,
  type RecipeInput,
  type RecipeIngredientInput,
  type RecipeGarnishInput,
} from "@/lib/recipe-validation";

const LABEL =
  "block font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mb-1.5";
const FIELD =
  "w-full px-3 py-2.5 bg-surface-low border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:border-gold focus:outline-none transition-colors duration-200 placeholder:text-grey/40 min-h-[44px]";
const H2 =
  "font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-4";

function emptyIngredient(): RecipeIngredientInput {
  return {
    ingredientName: "",
    ingredientCategory: "spirit",
    amount: "",
    unit: "ml",
    brand: null,
    isOptional: false,
  };
}
function emptyGarnish(): RecipeGarnishInput {
  return {
    garnishName: "",
    garnishCategory: "fruit",
    quantity: "",
    quantityUnit: "piece",
  };
}

export function RecipeForm({
  initial,
  action,
  submitLabel,
}: {
  initial?: RecipeInput;
  action: (input: RecipeInput) => Promise<{ errors: string[] }>;
  submitLabel: string;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [defaultMenuName, setDefaultMenuName] = useState(
    initial?.defaultMenuName ?? ""
  );
  const [defaultMenuDescription, setDefaultMenuDescription] = useState(
    initial?.defaultMenuDescription ?? ""
  );
  const [season, setSeason] = useState(initial?.season ?? "all_year");
  const [glassType, setGlassType] = useState(initial?.glassType ?? "rocks");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [iceType, setIceType] = useState(initial?.iceType ?? "");
  const [iceAmountG, setIceAmountG] = useState(
    initial?.iceAmountG != null ? String(initial.iceAmountG) : ""
  );
  const [straw, setStraw] = useState(initial?.straw ?? false);
  const [strawType, setStrawType] = useState(initial?.strawType ?? "");
  const [isNonAlcoholic, setIsNonAlcoholic] = useState(
    initial?.isNonAlcoholic ?? false
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(
    initial?.referenceImageUrl ?? null
  );
  const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>(
    initial?.ingredients?.length ? initial.ingredients : [emptyIngredient()]
  );
  const [garnishes, setGarnishes] = useState<RecipeGarnishInput[]>(
    initial?.garnishes ?? []
  );

  function updateIngredient(i: number, patch: Partial<RecipeIngredientInput>) {
    setIngredients((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  }
  function updateGarnish(i: number, patch: Partial<RecipeGarnishInput>) {
    setGarnishes((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    const input: RecipeInput = {
      name,
      defaultMenuName,
      defaultMenuDescription: defaultMenuDescription || null,
      season,
      glassType,
      category: category || null,
      iceType: iceType || null,
      iceAmountG: iceAmountG.trim() === "" ? null : Number(iceAmountG),
      straw,
      strawType: strawType || null,
      isNonAlcoholic,
      notes: notes || null,
      referenceImageUrl,
      ingredients,
      garnishes,
    };
    const result = await action(input);
    setLoading(false);
    if (result?.errors?.length) setErrors(result.errors);
    // On success the action redirects; nothing else to do here.
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errors.length > 0 && (
        <div className="bg-error/5 border border-error/20 p-4">
          {errors.map((err, i) => (
            <p
              key={i}
              className="text-error text-sm font-[family-name:var(--font-raleway)]"
            >
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Core */}
      <section>
        <h2 className={H2}>Recipe</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Recipe name <span className="text-error">*</span></label>
            <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} placeholder="Spiced Passionstar" />
          </div>
          <div>
            <label className={LABEL}>Menu name <span className="text-error">*</span></label>
            <input className={FIELD} value={defaultMenuName} onChange={(e) => setDefaultMenuName(e.target.value)} placeholder="Spiced Passionstar" />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Menu description</label>
            <textarea className={FIELD.replace("min-h-[44px]", "")} rows={2} value={defaultMenuDescription} onChange={(e) => setDefaultMenuDescription(e.target.value)} placeholder="Spiced rum, passionfruit, lemon, pineapple…" />
          </div>
          <div>
            <label className={LABEL}>Season</label>
            <select className={FIELD} value={season} onChange={(e) => setSeason(e.target.value)}>
              {SEASONS.map((s) => (<option key={s} value={s}>{s.replace("_", " ")}</option>))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Glass</label>
            <select className={FIELD} value={glassType} onChange={(e) => setGlassType(e.target.value)}>
              {GLASS_TYPES.map((g) => (<option key={g} value={g}>{g.replace("_", " ")}</option>))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Category</label>
            <input className={FIELD} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Signature" />
          </div>
          <div>
            <label className={LABEL}>Ice type</label>
            <input className={FIELD} value={iceType} onChange={(e) => setIceType(e.target.value)} placeholder="Cubed" />
          </div>
          <div>
            <label className={LABEL}>Ice amount (g)</label>
            <input className={FIELD} type="number" value={iceAmountG} onChange={(e) => setIceAmountG(e.target.value)} placeholder="200" />
          </div>
          <div>
            <label className={LABEL}>Straw type</label>
            <input className={FIELD} value={strawType} onChange={(e) => setStrawType(e.target.value)} placeholder="Black short cardboard" />
          </div>
          <label className="flex items-center gap-2 mt-2 font-[family-name:var(--font-raleway)] text-sm text-charcoal min-h-[44px]">
            <input type="checkbox" checked={straw} onChange={(e) => setStraw(e.target.checked)} /> Straw
          </label>
          <label className="flex items-center gap-2 mt-2 font-[family-name:var(--font-raleway)] text-sm text-charcoal min-h-[44px]">
            <input type="checkbox" checked={isNonAlcoholic} onChange={(e) => setIsNonAlcoholic(e.target.checked)} /> Non-alcoholic
          </label>
        </div>
      </section>

      {/* Ingredients */}
      <section>
        <h2 className={H2}>Ingredients</h2>
        <div className="space-y-3">
          {ingredients.map((ing, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center">
              <input className={`${FIELD} md:col-span-3`} placeholder="Name" value={ing.ingredientName} onChange={(e) => updateIngredient(i, { ingredientName: e.target.value })} />
              <select className={`${FIELD} md:col-span-2`} value={ing.ingredientCategory} onChange={(e) => updateIngredient(i, { ingredientCategory: e.target.value })}>
                {INGREDIENT_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <input className={`${FIELD} md:col-span-2`} placeholder="Amount" value={ing.amount} onChange={(e) => updateIngredient(i, { amount: e.target.value })} />
              <select className={`${FIELD} md:col-span-2`} value={ing.unit} onChange={(e) => updateIngredient(i, { unit: e.target.value })}>
                {INGREDIENT_UNITS.map((u) => (<option key={u} value={u}>{u}</option>))}
              </select>
              <input className={`${FIELD} md:col-span-2`} placeholder="Brand" value={ing.brand ?? ""} onChange={(e) => updateIngredient(i, { brand: e.target.value || null })} />
              <button type="button" className="md:col-span-1 text-error text-sm min-h-[44px]" onClick={() => setIngredients((rows) => rows.filter((_, idx) => idx !== i))}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="mt-3 font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-gold-ink hover:underline min-h-[44px]" onClick={() => setIngredients((rows) => [...rows, emptyIngredient()])}>
          + Add ingredient
        </button>
      </section>

      {/* Garnishes */}
      <section>
        <h2 className={H2}>Garnishes</h2>
        <div className="space-y-3">
          {garnishes.map((g, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center">
              <input className={`${FIELD} md:col-span-4`} placeholder="Name" value={g.garnishName} onChange={(e) => updateGarnish(i, { garnishName: e.target.value })} />
              <select className={`${FIELD} md:col-span-3`} value={g.garnishCategory} onChange={(e) => updateGarnish(i, { garnishCategory: e.target.value })}>
                {GARNISH_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <input className={`${FIELD} md:col-span-2`} placeholder="Qty" value={g.quantity} onChange={(e) => updateGarnish(i, { quantity: e.target.value })} />
              <input className={`${FIELD} md:col-span-2`} placeholder="Unit" value={g.quantityUnit} onChange={(e) => updateGarnish(i, { quantityUnit: e.target.value })} />
              <button type="button" className="md:col-span-1 text-error text-sm min-h-[44px]" onClick={() => setGarnishes((rows) => rows.filter((_, idx) => idx !== i))}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="mt-3 font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-gold-ink hover:underline min-h-[44px]" onClick={() => setGarnishes((rows) => [...rows, emptyGarnish()])}>
          + Add garnish
        </button>
      </section>

      {/* Image + notes */}
      <section className="space-y-4">
        <ImageUploader value={referenceImageUrl} onChange={setReferenceImageUrl} />
        <div>
          <label className={LABEL}>Notes</label>
          <textarea className={FIELD.replace("min-h-[44px]", "")} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <button type="submit" disabled={loading} className="px-8 py-3 bg-gold-ink text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer">
          {loading ? "SAVING…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/recipes/recipe-form.tsx
git commit -m "feat(recipes): add recipe form component"
```

---

## Task 6: New + edit route pages

**Files:**
- Create: `src/app/(authenticated)/recipes/new/page.tsx`
- Create: `src/app/(authenticated)/recipes/[id]/edit/page.tsx`

- [ ] **Step 1: Create the "new" page**

```tsx
// src/app/(authenticated)/recipes/new/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createRecipe } from "@/actions/recipes";
import { RecipeForm } from "@/components/recipes/recipe-form";

export default async function NewRecipePage() {
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  if (session.role !== "owner" && session.role !== "super_admin") {
    redirect("/recipes");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight mb-6">
        New Recipe
      </h1>
      <RecipeForm action={createRecipe} submitLabel="CREATE RECIPE" />
    </div>
  );
}
```

- [ ] **Step 2: Create the "edit" page**

```tsx
// src/app/(authenticated)/recipes/[id]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRecipe, updateRecipe } from "@/actions/recipes";
import { RecipeForm } from "@/components/recipes/recipe-form";
import type { RecipeInput } from "@/lib/recipe-validation";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  if (session.role !== "owner" && session.role !== "super_admin") {
    redirect("/recipes");
  }

  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const initial: RecipeInput = {
    name: recipe.name,
    defaultMenuName: recipe.defaultMenuName,
    defaultMenuDescription: recipe.defaultMenuDescription,
    season: recipe.season ?? "all_year",
    glassType: recipe.glassType ?? "rocks",
    category: recipe.category,
    iceType: recipe.iceType,
    iceAmountG: recipe.iceAmountG,
    straw: recipe.straw ?? false,
    strawType: recipe.strawType,
    isNonAlcoholic: recipe.isNonAlcoholic ?? false,
    notes: recipe.notes,
    referenceImageUrl: recipe.referenceImageUrl,
    ingredients: recipe.ingredients.map((ing) => ({
      ingredientName: ing.ingredientName,
      ingredientCategory: ing.ingredientCategory ?? "other",
      amount: ing.amount,
      unit: ing.unit,
      brand: ing.brand,
      isOptional: ing.isOptional ?? false,
    })),
    garnishes: recipe.garnishes.map((g) => ({
      garnishName: g.garnishName,
      garnishCategory: g.garnishCategory ?? "fruit",
      quantity: g.quantity,
      quantityUnit: g.quantityUnit ?? "piece",
    })),
  };

  const updateAction = updateRecipe.bind(null, id);

  return (
    <div className="max-w-3xl">
      <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight mb-6">
        Edit Recipe
      </h1>
      <RecipeForm initial={initial} action={updateAction} submitLabel="SAVE CHANGES" />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(authenticated)/recipes/new/page.tsx" "src/app/(authenticated)/recipes/[id]/edit/page.tsx"
git commit -m "feat(recipes): add new and edit recipe routes"
```

---

## Task 7: List CTA + detail actions

**Files:**
- Create: `src/components/recipes/recipe-actions.tsx`
- Modify: `src/app/(authenticated)/recipes/page.tsx`
- Modify: `src/app/(authenticated)/recipes/[id]/page.tsx`

- [ ] **Step 1: Create the Duplicate/Archive actions component**

```tsx
// src/components/recipes/recipe-actions.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { duplicateRecipe, archiveRecipe } from "@/actions/recipes";

const BTN =
  "font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase min-h-[44px] flex items-center px-3 transition-colors duration-200";

export function RecipeActions({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Link href={`/recipes/${id}/edit`} className={`${BTN} bg-gold-ink text-cream hover:bg-gold`}>
        Edit
      </Link>
      <button
        type="button"
        disabled={busy}
        className={`${BTN} text-gold-ink hover:underline disabled:opacity-50`}
        onClick={async () => {
          setBusy(true);
          await duplicateRecipe(id);
        }}
      >
        Duplicate
      </button>
      <button
        type="button"
        disabled={busy}
        className={`${BTN} text-error hover:underline disabled:opacity-50`}
        onClick={async () => {
          if (!confirm("Archive this recipe? It will be hidden from the library and the event picker.")) return;
          setBusy(true);
          await archiveRecipe(id);
        }}
      >
        Archive
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add the "New recipe" CTA to the list page**

In `src/app/(authenticated)/recipes/page.tsx`, add imports at the top:

```tsx
import { getSession } from "@/lib/session";
```

Replace the existing header block:

```tsx
      {/* Header */}
      <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight mb-6">
        Recipe Library
      </h1>
```

with (and add `const session = await getSession();` right after the existing `const recipes = await listRecipes(season);` line):

```tsx
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
          Recipe Library
        </h1>
        {session && (session.role === "owner" || session.role === "super_admin") && (
          <Link
            href="/recipes/new"
            className="px-5 py-2.5 bg-gold-ink text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold transition-colors duration-200 min-h-[44px] flex items-center"
          >
            New recipe
          </Link>
        )}
      </div>
```

(The list page already imports `Link`.)

- [ ] **Step 3: Add the actions to the detail page**

In `src/app/(authenticated)/recipes/[id]/page.tsx`, add imports:

```tsx
import { getSession } from "@/lib/session";
import { RecipeActions } from "@/components/recipes/recipe-actions";
```

After `if (!recipe) notFound();`, add:

```tsx
  const session = await getSession();
  const canEdit =
    session?.role === "owner" || session?.role === "super_admin";
```

Then, inside the header `div` (the one containing the back-link and title), append after the title block so editors get the controls — replace the header `</div>` closing the flex row with the actions inserted:

```tsx
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/recipes"
            className="text-grey hover:text-charcoal text-sm transition-colors duration-200"
          >
            &larr;
          </Link>
          <div>
            <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
              {recipe.defaultMenuName}
            </h1>
            {recipe.defaultMenuDescription && (
              <p className="font-[family-name:var(--font-cormorant)] text-base italic text-gold-ink/70 mt-1">
                {recipe.defaultMenuDescription}
              </p>
            )}
          </div>
        </div>
        {canEdit && <RecipeActions id={recipe.id} />}
      </div>
```

- [ ] **Step 4: Verify the event picker already excludes archived recipes**

Run: `grep -n "isActive" src/actions/event-cocktails.ts`
Expected: a line showing `.where(eq(cocktails.isActive, true))` inside `getAvailableCocktails`. No code change — this confirms archived recipes can't be added to new events.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint src/components/recipes "src/app/(authenticated)/recipes"`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/recipes/recipe-actions.tsx "src/app/(authenticated)/recipes/page.tsx" "src/app/(authenticated)/recipes/[id]/page.tsx"
git commit -m "feat(recipes): add New CTA and Edit/Duplicate/Archive actions"
```

---

## Task 8: Document the new env var

**Files:**
- Modify: `.env.example`
- Modify: `docs/production-setup.md`

- [ ] **Step 1: Add `BLOB_READ_WRITE_TOKEN` to `.env.example`**

Append to `.env.example`:

```bash
# Vercel Blob — required for cocktail reference image uploads.
# Auto-set in Vercel when a Blob store is connected; for local dev pull via `vercel env pull`.
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 2: Add it to the production-setup env table**

In `docs/production-setup.md`, add this row to the env-vars table in §1 (after the `ENABLE_TEST_AUTH` row):

```markdown
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob — cocktail reference image uploads | Auto-set when a Blob store is connected to the project. |
```

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/production-setup.md
git commit -m "docs(recipes): document BLOB_READ_WRITE_TOKEN env var"
```

---

## Task 9: End-to-end test

**Files:**
- Create: `e2e/recipe-editor.spec.ts`

Read an existing spec first (e.g. `e2e/settings.spec.ts` and `e2e/owner-crud.spec.ts`) to copy the exact test-auth sign-in helper and base-URL conventions this repo uses. Reuse that sign-in helper rather than inventing one — the snippet below names it `signInAs`; rename to match the repo.

- [ ] **Step 1: Write the E2E spec**

```typescript
// e2e/recipe-editor.spec.ts
import { test, expect } from "@playwright/test";
// import { signInAs } from "./helpers"; // use the repo's actual test-auth helper

test.describe("Recipe editor (owner)", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as owner using the repo's ENABLE_TEST_AUTH helper, e.g.:
    // await signInAs(page, "murdo@bar-excellence.co.uk");
    await page.goto("/auth/test-signin?email=murdo@bar-excellence.co.uk&redirect=/recipes");
  });

  test("creates a recipe and shows it in the library", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByLabel("Recipe name").fill("E2E Test Cocktail");
    await page.getByLabel("Menu name").fill("E2E Test Cocktail");
    // first ingredient row
    await page.getByPlaceholder("Name").first().fill("Test Gin");
    await page.getByPlaceholder("Amount").first().fill("50");
    await page.getByRole("button", { name: "CREATE RECIPE" }).click();
    await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]+$/);
    await page.goto("/recipes");
    await expect(page.getByText("E2E Test Cocktail")).toBeVisible();
  });

  test("edits a recipe and persists the change", async ({ page }) => {
    await page.goto("/recipes");
    await page.getByText("E2E Test Cocktail").first().click();
    await page.getByRole("link", { name: "Edit" }).click();
    await page.getByLabel("Menu name").fill("E2E Renamed Cocktail");
    await page.getByRole("button", { name: "SAVE CHANGES" }).click();
    await expect(page.getByText("E2E Renamed Cocktail")).toBeVisible();
  });

  test("duplicates a recipe", async ({ page }) => {
    await page.goto("/recipes");
    await page.getByText("E2E Renamed Cocktail").first().click();
    await page.getByRole("button", { name: "Duplicate" }).click();
    await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]+\/edit$/);
    await expect(page.getByLabel("Recipe name")).toHaveValue(/^Copy of /);
  });

  test("archives a recipe (gone from library)", async ({ page }) => {
    await page.goto("/recipes");
    await page.getByText("E2E Renamed Cocktail").first().click();
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page).toHaveURL(/\/recipes$/);
    await expect(page.getByText("E2E Renamed Cocktail")).toHaveCount(0);
  });
});

test("partner sees no edit affordances", async ({ page }) => {
  await page.goto("/auth/test-signin?email=rory@lc-group.com&redirect=/recipes");
  await page.goto("/recipes");
  await expect(page.getByRole("link", { name: "New recipe" })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the E2E spec**

Run: `npm run test:e2e -- recipe-editor`
Expected: PASS. (If the test-auth route path or sign-in helper differs, adjust to match the repo's other specs. Blob upload is not exercised here — recipes save fine without an image.)

- [ ] **Step 3: Commit**

```bash
git add e2e/recipe-editor.spec.ts
git commit -m "test(recipes): add recipe editor e2e coverage"
```

---

## Task 10: Update CLAUDE.md + final verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Document the feature in CLAUDE.md**

Add a section under the spec descriptions (e.g. after "Per-cocktail ice / straw / reference image (Spec H)"):

```markdown
### Recipe editor (owner CRUD)
Owner/super_admin manage the cocktail library in-app (partner stays read-only):
- Routes: `/recipes/new`, `/recipes/[id]/edit` (role-gated; partner redirected to `/recipes`)
- Actions in `src/actions/recipes.ts`: `createRecipe`, `updateRecipe` (replaces child rows — neon-http has no transactions), `archiveRecipe` (soft delete `isActive=false`), `duplicateRecipe` ("Copy of …", clones children)
- Validation: `src/lib/recipe-validation.ts` (`validateRecipeInput`) — TDD
- Reference images upload to Vercel Blob via `POST /api/recipes/upload` (role-gated `handleUpload`); needs `BLOB_READ_WRITE_TOKEN`
- Archived recipes drop out of `listRecipes` and `getAvailableCocktails` (both filter `isActive=true`); historical events keep their cocktail rows
- Components: `recipe-form.tsx`, `image-uploader.tsx`, `recipe-actions.tsx`
```

- [ ] **Step 2: Full verification**

Run: `npm run test -- --run && npx tsc --noEmit -p tsconfig.json && npm run build`
Expected: all tests pass, 0 type errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document recipe editor in CLAUDE.md"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** Routes (T6), shared form (T5), actions create/update/archive/duplicate (T2), validation (T1), Blob upload (T3/T4), permissions + picker filter (T6/T7), testing (T1/T9), env/migration (T8 — no migration), CLAUDE.md (T10). All spec sections mapped.
- **Type consistency:** `RecipeInput`/`RecipeIngredientInput`/`RecipeGarnishInput` defined in T1, imported unchanged by T2/T5/T6. `validateRecipeInput` returns `string[]` (matches the form's `errors: string[]`). Action signatures `createRecipe(input)`, `updateRecipe(id, input)` (bound via `.bind` in T6), `archiveRecipe(id)`, `duplicateRecipe(id)` consistent across T2/T6/T7.
- **Placeholder scan:** none — the only deliberately-deferred detail is the E2E sign-in helper name, which T9 instructs the engineer to copy from existing specs.
- **Open follow-up (not in this plan):** restoring archived recipes (UI) is an intentional v2 item per the spec.
