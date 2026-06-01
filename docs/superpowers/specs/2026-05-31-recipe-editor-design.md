# Recipe Editor — Design

**Date:** 2026-05-31
**Status:** Approved (design); pending implementation plan
**Topic:** Owner-facing CRUD for the cocktail recipe library

## Problem

The recipe library (`/recipes`) is read-only. `src/actions/recipes.ts` exposes only
`listRecipes` and `getRecipe` — there is no way to create, edit, duplicate, or remove a
cocktail from the app. Only 6 of ~20 recipes are seeded; the rest require a developer to
edit `seed.ts` and reseed. For an owner-operated tool this is fragile: Murdo must be able
to manage his own recipes (and keep editing them) without engineering involvement.

## Goal

Give owner/super_admin full management of the cocktail library — create, edit, duplicate,
and archive recipes including their ingredients, garnishes, ice/straw details, and a
reference image — inside the app, in Reserve Noir style, with no schema migration.

## Non-goals (v1)

- Restoring archived recipes via UI (archive is one-way in v1; trivial fast-follow).
- Partner editing (partner stays read-only).
- Bulk import / CSV.
- Image cropping/editing (upload + replace/remove only).
- Per-ingredient reference images.

## Approach

Mirror the existing **events** pattern: dedicated routes + a shared form component.

- `/recipes/new` and `/recipes/[id]/edit` both render a shared `<RecipeForm>`.
- Rejected alternatives: a slide-over editor (too cramped for a large dynamic-row form)
  and inline edit-in-place on the detail page (mixes read/edit state). A full page is the
  right canvas and matches `event-form.tsx`, keeping the codebase consistent.

## Architecture

### Routes & pages
- `src/app/(authenticated)/recipes/new/page.tsx` — renders `<RecipeForm mode="create">`.
- `src/app/(authenticated)/recipes/[id]/edit/page.tsx` — loads `getRecipe(id)`, renders
  `<RecipeForm mode="edit">`. 404 if not found.
- Both route pages call `requireRole("owner", "super_admin")` server-side; partner is
  redirected (mirrors `/settings`).
- `/recipes` (existing grid): add a gold **"New recipe"** CTA (owner/super_admin only).
- `/recipes/[id]` (existing detail): add **Edit · Duplicate · Archive** affordances,
  gated by role.

### Components
- `src/components/recipes/recipe-form.tsx` (`"use client"`) — the main form. Controlled
  state for: core fields (`name`, `defaultMenuName`, `defaultMenuDescription`, `season`,
  `glassType`, `category`, `iceType`, `iceAmountG`, `straw`, `strawType`,
  `isNonAlcoholic`, `notes`); **dynamic ingredient rows** (`ingredientName`,
  `ingredientCategory`, `amount`, `unit`, `brand`, `isOptional`, `sortOrder` with
  add/remove/reorder); **dynamic garnish rows** (`garnishName`, `garnishCategory`,
  `quantity`, `quantityUnit`, `sortOrder`); and an `<ImageUploader>`. Submits to the
  create/update server action; renders field errors inline (mirrors `event-form.tsx`).
- `src/components/recipes/image-uploader.tsx` (`"use client"`) — Vercel Blob client
  upload, preview, replace/remove. Restricts to images, caps size (~5MB).
- Small server components/buttons for New/Edit/Duplicate/Archive, role-gated.

### Server actions — extend `src/actions/recipes.ts` (`"use server"`)
All new actions call `requireRole("owner", "super_admin")` first.
- `createRecipe(input)` → insert `cocktails` row, then ingredient + garnish rows by
  `sortOrder`; returns `{ id }`.
- `updateRecipe(id, input)` → update `cocktails` row; **replace child rows** (delete all
  `cocktailIngredients` / `cocktailGarnishes` for the id, then re-insert from input). neon-http
  has no transactions, so this is a non-atomic delete-then-insert — accepted for a 3-user
  internal tool (see Trade-offs). Bumps `updatedAt`.
- `archiveRecipe(id)` → soft delete: set `isActive = false`.
- `duplicateRecipe(id)` → clone the `cocktails` row (name → `"Copy of <name>"`,
  `isActive = true`, fresh timestamps) and clone its ingredient + garnish rows; returns
  `{ id }` of the clone (caller redirects to `/recipes/<id>/edit`).
- Each mutation calls `revalidatePath("/recipes")` (and the detail path on update).

### Validation
- New `src/lib/recipe-validation.ts` — pure function `validateRecipeInput(input)` returning
  field errors (mirrors `recipient-validation.ts`). Rules: `name` and `defaultMenuName`
  required (non-empty trimmed); at least one ingredient; each ingredient `amount` parses to
  a number and `unit` ∈ ingredient-unit enum; each garnish `quantity` parses to a number.
  `iceAmountG`, if present, is a non-negative integer.
- The server action runs this before writing; the form renders the returned errors inline.

### Image upload (Vercel Blob)
- Canonical Vercel client-upload pattern: the client uses `@vercel/blob/client`'s
  `upload()` to send the file to a token-issuing route
  `src/app/api/recipes/upload/route.ts` that calls `handleUpload` (validates role +
  content type, restricts to images). This keeps large file payloads out of the server
  action.
- On success the returned Blob URL is stored in the form's `referenceImageUrl` state and
  persisted with the recipe via create/update.
- New env var: **`BLOB_READ_WRITE_TOKEN`** — add to `.env.example` and
  `docs/production-setup.md`. (In Vercel, provisioning a Blob store sets this automatically.)

### Permissions / defence-in-depth
- Partner: library stays read-only — no New/Edit/Duplicate/Archive affordances rendered;
  routes and actions reject via `requireRole`.
- The event cocktail-picker's `availableCocktails` query is filtered to `isActive = true`
  so an archived recipe cannot be added to *new* events. Historical events are unaffected:
  the `cocktails` row persists (only `isActive` flips), so `eventCocktails` joins and past
  briefs/PDFs still render.
- `listRecipes` already filters `isActive = true`, so archiving removes a recipe from the
  library automatically.

## Data flow

1. Owner clicks "New recipe" → `/recipes/new` → fills `<RecipeForm>`.
2. Adding an image → file uploads to Blob via `/api/recipes/upload` → URL returned to form.
3. Submit → `createRecipe(input)` validates, inserts cocktail + children → redirect to the
   new recipe's detail page `/recipes/<id>`.
4. Edit → `/recipes/[id]/edit` pre-filled from `getRecipe` → `updateRecipe` replaces children.
5. Duplicate → `duplicateRecipe(id)` → redirect to the clone's `/edit`.
6. Archive → `archiveRecipe(id)` → recipe disappears from `/recipes` and the picker.

## Error handling
- Validation failures return structured field errors; the form shows them inline and does
  not submit.
- Upload failures (wrong type, too large, network) surface in the uploader; the recipe can
  still be saved without an image.
- Actions reject non-owner/super_admin callers (`requireRole` throws → handled as today).
- `updateRecipe`'s non-atomic child replacement: on a mid-operation failure the recipe could
  briefly have deleted-but-not-reinserted children. Mitigation: delete + insert run
  back-to-back with no awaited work between; acceptable for this tool. Documented, not
  engineered around (no transactions on neon-http).

## Testing
- **Unit (TDD):** `src/lib/recipe-validation.test.ts` — required fields, ingredient/garnish
  numeric + enum rules, empty-ingredient rejection, iceAmountG bounds.
- **E2E:** `e2e/recipe-editor.spec.ts` — create (appears in list), edit (persists),
  duplicate ("Copy of…" opens in edit), archive (gone from list and from the event picker);
  partner sees no edit affordances.

## Schema / migration impact
**None.** All required columns already exist on `cocktails` / `cocktailIngredients` /
`cocktailGarnishes`, including `isActive`. No Drizzle migration.

## Trade-offs / decisions
- **Soft archive over hard delete:** `eventCocktails` reference `cocktails`; hard delete
  would break historical briefs. Soft archive preserves history and is reversible later.
- **Delete-then-reinsert children on update:** simplest correct approach without
  transactions; non-atomic but acceptable at this scale.
- **Dedicated routes over slide-over:** consistency with events + room for a large form.
- **Archive one-way in v1:** restore is a trivial fast-follow (`isActive = true` + an
  "archived" filter); omitted now per YAGNI.

## New env var
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob) — required for image upload.
