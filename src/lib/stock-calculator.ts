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
  iceAmountG?: number | null;
  iceType?: string | null;
  straw?: boolean | null;
  strawType?: string | null;
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

export interface IceResult {
  iceType: string;
  totalKg: number;
}

export interface StrawResult {
  strawType: string;
  totalCount: number;
}

export interface EventStockItem {
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  brand: string | null;
  scalingRule: "per_event" | "per_station";
}

export interface ConsumableResult {
  itemName: string;
  brand: string | null;
  category: string;
  totalQuantity: number;
  unit: string;
}

export interface CalculateStockOptions {
  eventStockItems?: EventStockItem[];
  stationCount?: number | null;
}

export interface StockResult {
  ingredients: IngredientResult[];
  garnishes: GarnishResult[];
  manualItems: ManualItem[];
  ice: IceResult[];
  straws: StrawResult[];
  consumables: ConsumableResult[];
  warnings: string[];
}

export function calculateStock(
  cocktails: CocktailInput[],
  options: CalculateStockOptions = {}
): StockResult {
  const warnings: string[] = [];
  const { eventStockItems = [], stationCount = null } = options;

  // Resolve consumables first — we need their names to de-dupe later.
  const consumables: ConsumableResult[] = eventStockItems.map((item) => {
    const multiplier =
      item.scalingRule === "per_station" ? stationCount ?? 1 : 1;
    if (item.scalingRule === "per_station" && stationCount == null) {
      warnings.push(
        `'${item.itemName}' is per_station but stationCount is null — treating as per_event`
      );
    }
    return {
      itemName: item.itemName,
      brand: item.brand,
      category: item.category,
      totalQuantity: item.quantity * multiplier,
      unit: item.unit,
    };
  });
  const consumableNames = new Set(
    consumables.map((c) => c.itemName.toLowerCase())
  );

  if (cocktails.length === 0) {
    return {
      ingredients: [],
      garnishes: [],
      manualItems: [],
      ice: [],
      straws: [],
      consumables,
      warnings: warnings.concat("No cocktails selected"),
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
        // Non-ml units go to manual items (drops, dash, piece, etc.) —
        // unless an eventStock entry already covers this item by name,
        // in which case the consumable row is the procurement truth.
        if (consumableNames.has(ing.ingredientName.toLowerCase())) continue;
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
      // Suppress garnish rows that are already covered by an eventStock entry
      // (e.g. gold duster lives in consumables, not as a per-serve garnish count).
      if (consumableNames.has(g.garnishName.toLowerCase())) continue;
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

  // Aggregate ice by type (no buffer — ice numbers stay close to recipe; Murdo can pad)
  const iceMap = new Map<string, number>();
  for (const cocktail of cocktails) {
    if (!cocktail.iceAmountG || !cocktail.iceType) continue;
    const totalG = cocktail.servesAllocated * cocktail.iceAmountG;
    iceMap.set(cocktail.iceType, (iceMap.get(cocktail.iceType) || 0) + totalG);
  }
  const ice: IceResult[] = Array.from(iceMap, ([iceType, totalG]) => ({
    iceType,
    totalKg: Math.ceil(totalG / 1000),
  }));

  // Aggregate straws by type (with garnish buffer — disposable consumable)
  const strawMap = new Map<string, number>();
  for (const cocktail of cocktails) {
    if (!cocktail.straw || !cocktail.strawType) continue;
    strawMap.set(
      cocktail.strawType,
      (strawMap.get(cocktail.strawType) || 0) + cocktail.servesAllocated
    );
  }
  const straws: StrawResult[] = Array.from(strawMap, ([strawType, count]) => ({
    strawType,
    totalCount: Math.ceil(count * GARNISH_BUFFER),
  }));

  // Sort by category then name
  ingredients.sort(
    (a, b) =>
      a.ingredientCategory.localeCompare(b.ingredientCategory) ||
      a.ingredientName.localeCompare(b.ingredientName)
  );
  garnishes.sort((a, b) => a.garnishName.localeCompare(b.garnishName));
  ice.sort((a, b) => a.iceType.localeCompare(b.iceType));
  straws.sort((a, b) => a.strawType.localeCompare(b.strawType));
  consumables.sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      a.itemName.localeCompare(b.itemName)
  );

  return {
    ingredients,
    garnishes,
    manualItems,
    ice,
    straws,
    consumables,
    warnings,
  };
}
