// Bottle sizes — application-level constants (UK standard)
// 700ml for spirits (UK), 1000ml for juices/syrups, 500ml for purees
export const BOTTLE_SIZES: Record<string, number> = {
  spirit: 700,
  modifier: 700,
  juice: 1000,
  syrup: 1000,
  puree: 500,
  citrus: 1000,
  foamer: 500,
  soda: 1000,
  other: 1000,
};

const ML_UNITS = new Set(["ml", "g"]);
const WASTAGE_BUFFER = 1.15; // 15% for spirits/mixers
const GARNISH_BUFFER = 1.1; // 10% for garnishes

interface CocktailInput {
  servesAllocated: number;
  ingredients: {
    ingredientName: string;
    amount: number;
    unit: string;
    brand: string | null;
    ingredientCategory: string;
  }[];
  garnishes: {
    garnishName: string;
    quantity: number;
    quantityUnit: string;
  }[];
}

export interface IngredientResult {
  ingredientName: string;
  brand: string | null;
  ingredientCategory: string;
  totalMl: number;
  purchaseUnits: number;
  bottleSize: number;
}

export interface GarnishResult {
  garnishName: string;
  totalQuantity: number;
  totalWithBuffer: number;
  quantityUnit: string;
}

export interface ManualItem {
  ingredientName: string;
  totalQuantity: number;
  unit: string;
  brand: string | null;
}

export interface StockResult {
  ingredients: IngredientResult[];
  garnishes: GarnishResult[];
  manualItems: ManualItem[];
  warnings: string[];
}

export function calculateStock(cocktails: CocktailInput[]): StockResult {
  const warnings: string[] = [];

  if (cocktails.length === 0) {
    return {
      ingredients: [],
      garnishes: [],
      manualItems: [],
      warnings: ["No cocktails selected"],
    };
  }

  if (cocktails.some((c) => c.servesAllocated === 0)) {
    warnings.push("Some cocktails have 0 serves allocated");
  }

  // Aggregate ingredients by name + brand
  const ingredientMap = new Map<
    string,
    {
      totalMl: number;
      brand: string | null;
      ingredientCategory: string;
      ingredientName: string;
    }
  >();
  const manualItems: ManualItem[] = [];

  for (const cocktail of cocktails) {
    for (const ing of cocktail.ingredients) {
      if (ing.amount === 0) continue;

      if (!ML_UNITS.has(ing.unit)) {
        // Non-ml units go to manual items (drops, dash, piece, etc.)
        const total = cocktail.servesAllocated * ing.amount;
        manualItems.push({
          ingredientName: ing.ingredientName,
          totalQuantity: total,
          unit: ing.unit,
          brand: ing.brand,
        });
        continue;
      }

      const key = `${ing.ingredientName}||${ing.brand || ""}`;
      const existing = ingredientMap.get(key);
      const amount = cocktail.servesAllocated * ing.amount;

      if (existing) {
        existing.totalMl += amount;
      } else {
        ingredientMap.set(key, {
          totalMl: amount,
          brand: ing.brand,
          ingredientCategory: ing.ingredientCategory,
          ingredientName: ing.ingredientName,
        });
      }
    }
  }

  // Calculate purchase units with wastage buffer
  const ingredients: IngredientResult[] = [];
  for (const item of ingredientMap.values()) {
    const withBuffer = Math.round(item.totalMl * WASTAGE_BUFFER);
    const bottleSize = BOTTLE_SIZES[item.ingredientCategory] || 1000;
    ingredients.push({
      ingredientName: item.ingredientName,
      brand: item.brand,
      ingredientCategory: item.ingredientCategory,
      totalMl: withBuffer,
      purchaseUnits: Math.ceil(withBuffer / bottleSize),
      bottleSize,
    });
  }

  // Aggregate garnishes
  const garnishMap = new Map<
    string,
    { total: number; quantityUnit: string }
  >();
  for (const cocktail of cocktails) {
    for (const g of cocktail.garnishes) {
      const key = g.garnishName;
      const total = cocktail.servesAllocated * g.quantity;
      const existing = garnishMap.get(key);
      if (existing) {
        existing.total += total;
      } else {
        garnishMap.set(key, { total, quantityUnit: g.quantityUnit });
      }
    }
  }

  const garnishes: GarnishResult[] = [];
  for (const [name, item] of garnishMap) {
    garnishes.push({
      garnishName: name,
      totalQuantity: item.total,
      totalWithBuffer: Math.round(item.total * GARNISH_BUFFER),
      quantityUnit: item.quantityUnit,
    });
  }

  // Sort by category then name
  ingredients.sort(
    (a, b) =>
      a.ingredientCategory.localeCompare(b.ingredientCategory) ||
      a.ingredientName.localeCompare(b.ingredientName)
  );
  garnishes.sort((a, b) => a.garnishName.localeCompare(b.garnishName));

  return { ingredients, garnishes, manualItems, warnings };
}
