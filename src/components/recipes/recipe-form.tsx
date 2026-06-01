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
const TEXTAREA_FIELD =
  "w-full px-3 py-2.5 bg-surface-low border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:border-gold focus:outline-none transition-colors duration-200 placeholder:text-grey/40";
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
    try {
      const result = await action(input);
      if (result?.errors?.length) setErrors(result.errors);
    } catch (err) {
      // Next.js redirect() throws internally — let it propagate.
      if ((err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw err;
      setErrors(["An unexpected error occurred. Please try again."]);
    } finally {
      setLoading(false);
    }
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
            <label htmlFor="recipe-name" className={LABEL}>Recipe name <span className="text-error">*</span></label>
            <input id="recipe-name" className={FIELD} value={name} onChange={(e) => setName(e.target.value)} placeholder="Spiced Passionstar" />
          </div>
          <div>
            <label htmlFor="recipe-default-menu-name" className={LABEL}>Menu name <span className="text-error">*</span></label>
            <input id="recipe-default-menu-name" className={FIELD} value={defaultMenuName} onChange={(e) => setDefaultMenuName(e.target.value)} placeholder="Spiced Passionstar" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="recipe-default-menu-description" className={LABEL}>Menu description</label>
            <textarea id="recipe-default-menu-description" className={TEXTAREA_FIELD} rows={2} value={defaultMenuDescription} onChange={(e) => setDefaultMenuDescription(e.target.value)} placeholder="Spiced rum, passionfruit, lemon, pineapple…" />
          </div>
          <div>
            <label htmlFor="recipe-season" className={LABEL}>Season</label>
            <select id="recipe-season" className={FIELD} value={season} onChange={(e) => setSeason(e.target.value)}>
              {SEASONS.map((s) => (<option key={s} value={s}>{s.replace("_", " ")}</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="recipe-glass-type" className={LABEL}>Glass</label>
            <select id="recipe-glass-type" className={FIELD} value={glassType} onChange={(e) => setGlassType(e.target.value)}>
              {GLASS_TYPES.map((g) => (<option key={g} value={g}>{g.replace("_", " ")}</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="recipe-category" className={LABEL}>Category</label>
            <input id="recipe-category" className={FIELD} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Signature" />
          </div>
          <div>
            <label htmlFor="recipe-ice-type" className={LABEL}>Ice type</label>
            <input id="recipe-ice-type" className={FIELD} value={iceType} onChange={(e) => setIceType(e.target.value)} placeholder="Cubed" />
          </div>
          <div>
            <label htmlFor="recipe-ice-amount-g" className={LABEL}>Ice amount (g)</label>
            <input id="recipe-ice-amount-g" className={FIELD} type="number" value={iceAmountG} onChange={(e) => setIceAmountG(e.target.value)} placeholder="200" />
          </div>
          <div>
            <label htmlFor="recipe-straw-type" className={LABEL}>Straw type</label>
            <input id="recipe-straw-type" className={FIELD} value={strawType} onChange={(e) => setStrawType(e.target.value)} placeholder="Black short cardboard" />
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
            <div key={i} className="flex items-center gap-2">
              <div className="grid grid-cols-2 md:grid-cols-12 gap-2 flex-1">
                <input aria-label="Ingredient name" className={`${FIELD} md:col-span-3`} placeholder="Name" value={ing.ingredientName} onChange={(e) => updateIngredient(i, { ingredientName: e.target.value })} />
                <select aria-label="Ingredient category" className={`${FIELD} md:col-span-3`} value={ing.ingredientCategory} onChange={(e) => updateIngredient(i, { ingredientCategory: e.target.value })}>
                  {INGREDIENT_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
                <input aria-label="Ingredient amount" className={`${FIELD} md:col-span-2`} placeholder="Amount" value={ing.amount} onChange={(e) => updateIngredient(i, { amount: e.target.value })} />
                <select aria-label="Ingredient unit" className={`${FIELD} md:col-span-2`} value={ing.unit} onChange={(e) => updateIngredient(i, { unit: e.target.value })}>
                  {INGREDIENT_UNITS.map((u) => (<option key={u} value={u}>{u}</option>))}
                </select>
                <input aria-label="Ingredient brand" className={`${FIELD} md:col-span-2`} placeholder="Brand" value={ing.brand ?? ""} onChange={(e) => updateIngredient(i, { brand: e.target.value || null })} />
              </div>
              <label className="flex items-center gap-1 font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.12em] uppercase text-grey whitespace-nowrap min-h-[44px]">
                <input type="checkbox" checked={ing.isOptional} onChange={(e) => updateIngredient(i, { isOptional: e.target.checked })} /> Opt
              </label>
              <button type="button" aria-label="Remove ingredient" className="text-error text-sm min-h-[44px]" onClick={() => setIngredients((rows) => rows.filter((_, idx) => idx !== i))}>✕</button>
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
              <input aria-label="Garnish name" className={`${FIELD} md:col-span-4`} placeholder="Name" value={g.garnishName} onChange={(e) => updateGarnish(i, { garnishName: e.target.value })} />
              <select aria-label="Garnish category" className={`${FIELD} md:col-span-3`} value={g.garnishCategory} onChange={(e) => updateGarnish(i, { garnishCategory: e.target.value })}>
                {GARNISH_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <input aria-label="Garnish quantity" className={`${FIELD} md:col-span-2`} placeholder="Qty" value={g.quantity} onChange={(e) => updateGarnish(i, { quantity: e.target.value })} />
              <input aria-label="Garnish unit" className={`${FIELD} md:col-span-2`} placeholder="Unit" value={g.quantityUnit} onChange={(e) => updateGarnish(i, { quantityUnit: e.target.value })} />
              <button type="button" aria-label="Remove garnish" className="md:col-span-1 text-error text-sm min-h-[44px]" onClick={() => setGarnishes((rows) => rows.filter((_, idx) => idx !== i))}>✕</button>
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
          <label htmlFor="recipe-notes" className={LABEL}>Notes</label>
          <textarea id="recipe-notes" className={TEXTAREA_FIELD} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
