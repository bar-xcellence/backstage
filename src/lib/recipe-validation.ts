export const INGREDIENT_UNITS = [
  "ml", "g", "drops", "dash", "piece", "whole", "bunch", "sprig",
] as const;

export const INGREDIENT_CATEGORIES = [
  "spirit", "puree", "juice", "syrup", "citrus", "modifier", "foamer", "soda", "other",
] as const;

export const GARNISH_CATEGORIES = ["fruit", "botanical", "decorative", "spray"] as const;

export const SEASONS = ["spring", "summer", "autumn", "winter", "all_year"] as const;

export const GLASS_TYPES = [
  "rocks", "coupe", "highball", "martini", "flute", "polycarb_rocks", "other",
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
    if (!INGREDIENT_CATEGORIES.includes(ing.ingredientCategory as (typeof INGREDIENT_CATEGORIES)[number])) {
      errors.push(`Ingredient ${n}: invalid category`);
    }
  });

  input.garnishes.forEach((g, i) => {
    const n = i + 1;
    if (!g.garnishName?.trim()) errors.push(`Garnish ${n}: name is required`);
    if (!isNumeric(g.quantity)) errors.push(`Garnish ${n}: quantity must be a number`);
    if (!GARNISH_CATEGORIES.includes(g.garnishCategory as (typeof GARNISH_CATEGORIES)[number])) {
      errors.push(`Garnish ${n}: invalid category`);
    }
  });

  return errors;
}
