import { describe, it, expect } from "vitest";
import { calculateStock } from "./stock-calculator";

describe("Stock Calculator", () => {
  const espressoMartini = {
    servesAllocated: 50,
    ingredients: [
      {
        ingredientName: "Vodka",
        amount: 50,
        unit: "ml" as const,
        brand: "Absolut",
        ingredientCategory: "spirit" as const,
      },
      {
        ingredientName: "Coffee Liqueur",
        amount: 25,
        unit: "ml" as const,
        brand: "Kahlua",
        ingredientCategory: "spirit" as const,
      },
      {
        ingredientName: "Espresso",
        amount: 30,
        unit: "ml" as const,
        brand: null,
        ingredientCategory: "other" as const,
      },
    ],
    garnishes: [
      { garnishName: "Coffee Beans", quantity: 3, quantityUnit: "piece" },
    ],
  };

  it("calculates correct quantities for a single cocktail", () => {
    const result = calculateStock([espressoMartini]);
    const vodka = result.ingredients.find(
      (i) => i.ingredientName === "Vodka"
    );

    // 50 serves x 50ml = 2500ml x 1.15 buffer = 2875ml
    // ceil(2875 / 700) = 5 bottles
    expect(vodka?.totalMl).toBe(2875);
    expect(vodka?.purchaseUnits).toBe(5);
    expect(vodka?.bottleSize).toBe(700);
  });

  it("aggregates same ingredient across multiple cocktails", () => {
    const twoCocktails = [
      {
        servesAllocated: 100,
        ingredients: [
          {
            ingredientName: "Vodka",
            amount: 30,
            unit: "ml" as const,
            brand: "Absolut",
            ingredientCategory: "spirit" as const,
          },
        ],
        garnishes: [],
      },
      {
        servesAllocated: 100,
        ingredients: [
          {
            ingredientName: "Vodka",
            amount: 45,
            unit: "ml" as const,
            brand: "Absolut",
            ingredientCategory: "spirit" as const,
          },
        ],
        garnishes: [],
      },
    ];

    const result = calculateStock(twoCocktails);
    const vodka = result.ingredients.find(
      (i) => i.ingredientName === "Vodka"
    );

    // (100*30 + 100*45) = 7500ml x 1.15 = 8625ml
    // ceil(8625 / 700) = 13 bottles
    expect(vodka?.totalMl).toBe(8625);
    expect(vodka?.purchaseUnits).toBe(13);
  });

  it("handles 0 cocktails gracefully", () => {
    const result = calculateStock([]);
    expect(result.ingredients).toHaveLength(0);
    expect(result.garnishes).toHaveLength(0);
    expect(result.manualItems).toHaveLength(0);
    expect(result.warnings).toContain("No cocktails selected");
  });

  it("warns when cocktails have 0 serves", () => {
    const result = calculateStock([
      {
        servesAllocated: 0,
        ingredients: [
          {
            ingredientName: "Vodka",
            amount: 50,
            unit: "ml" as const,
            brand: null,
            ingredientCategory: "spirit" as const,
          },
        ],
        garnishes: [],
      },
    ]);
    expect(result.warnings).toContain(
      "Some cocktails have 0 serves allocated"
    );
  });

  it("separates non-ml units into manual items", () => {
    const result = calculateStock([
      {
        servesAllocated: 50,
        ingredients: [
          {
            ingredientName: "Angostura Bitters",
            amount: 3,
            unit: "drops" as const,
            brand: null,
            ingredientCategory: "modifier" as const,
          },
        ],
        garnishes: [],
      },
    ]);
    expect(result.manualItems).toHaveLength(1);
    expect(result.manualItems[0].ingredientName).toBe("Angostura Bitters");
    expect(result.manualItems[0].totalQuantity).toBe(150); // 50 x 3
    expect(result.manualItems[0].unit).toBe("drops");
  });

  it("skips ingredients with 0 amount", () => {
    const result = calculateStock([
      {
        servesAllocated: 50,
        ingredients: [
          {
            ingredientName: "Nothing",
            amount: 0,
            unit: "ml" as const,
            brand: null,
            ingredientCategory: "other" as const,
          },
        ],
        garnishes: [],
      },
    ]);
    expect(result.ingredients).toHaveLength(0);
  });

  it("calculates garnishes with 10% buffer", () => {
    const result = calculateStock([espressoMartini]);
    const beans = result.garnishes.find(
      (g) => g.garnishName === "Coffee Beans"
    );

    // 50 serves x 3 = 150 x 1.10 = 165
    expect(beans?.totalWithBuffer).toBe(165);
  });

  it("keeps separate rows for same ingredient with different brands", () => {
    const result = calculateStock([
      {
        servesAllocated: 50,
        ingredients: [
          {
            ingredientName: "Vodka",
            amount: 50,
            unit: "ml" as const,
            brand: "Absolut",
            ingredientCategory: "spirit" as const,
          },
        ],
        garnishes: [],
      },
      {
        servesAllocated: 50,
        ingredients: [
          {
            ingredientName: "Vodka",
            amount: 50,
            unit: "ml" as const,
            brand: "Grey Goose",
            ingredientCategory: "spirit" as const,
          },
        ],
        garnishes: [],
      },
    ]);
    const vodkas = result.ingredients.filter(
      (i) => i.ingredientName === "Vodka"
    );
    expect(vodkas).toHaveLength(2);
  });

  it("rounds purchase units UP (ceiling)", () => {
    const result = calculateStock([
      {
        servesAllocated: 1,
        ingredients: [
          {
            ingredientName: "Vodka",
            amount: 50,
            unit: "ml" as const,
            brand: null,
            ingredientCategory: "spirit" as const,
          },
        ],
        garnishes: [],
      },
    ]);
    const vodka = result.ingredients.find(
      (i) => i.ingredientName === "Vodka"
    );
    // 1 x 50 = 50ml x 1.15 = 57.5 -> round = 58ml, ceil(58/700) = 1 bottle
    expect(vodka?.purchaseUnits).toBe(1);
  });
});
