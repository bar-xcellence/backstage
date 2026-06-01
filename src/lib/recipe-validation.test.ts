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
    expect(validateRecipeInput(input)).toContain("Ingredient 1: name is required");
  });

  it("rejects a non-numeric ingredient amount", () => {
    const input = base();
    input.ingredients[0].amount = "lots";
    expect(validateRecipeInput(input)).toContain("Ingredient 1: amount must be a number");
  });

  it("rejects an invalid ingredient unit", () => {
    const input = base();
    input.ingredients[0].unit = "gallons";
    expect(validateRecipeInput(input)).toContain("Ingredient 1: invalid unit");
  });

  it("rejects a non-numeric garnish quantity", () => {
    const input = base();
    input.garnishes[0].quantity = "some";
    expect(validateRecipeInput(input)).toContain("Garnish 1: quantity must be a number");
  });

  it("rejects a negative iceAmountG", () => {
    const errs = validateRecipeInput({ ...base(), iceAmountG: -5 });
    expect(errs).toContain("Ice amount must be a non-negative whole number");
  });

  it("allows garnishes to be empty", () => {
    expect(validateRecipeInput({ ...base(), garnishes: [] })).toEqual([]);
  });

  it("rejects an invalid ingredient category", () => {
    const input = base();
    input.ingredients[0].ingredientCategory = "booze";
    expect(validateRecipeInput(input)).toContain("Ingredient 1: invalid category");
  });

  it("rejects an invalid garnish category", () => {
    const input = base();
    input.garnishes[0].garnishCategory = "sparkle";
    expect(validateRecipeInput(input)).toContain("Garnish 1: invalid category");
  });

  it("rejects a garnish with a blank name", () => {
    const input = base();
    input.garnishes[0].garnishName = "";
    expect(validateRecipeInput(input)).toContain("Garnish 1: name is required");
  });
});
