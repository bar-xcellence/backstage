import { describe, it, expect } from "vitest";
import { scaleEquipment } from "./equipment-scaler";

describe("scaleEquipment", () => {
  const baseItems = [
    { itemName: "Boston Shaker", baseQuantity: 1, scalingRule: "per_station" as const },
    { itemName: "First Aid Kit", baseQuantity: 1, scalingRule: "fixed" as const },
    { itemName: "Store N Pour", baseQuantity: 1, scalingRule: "per_spirit" as const },
    { itemName: "Garnish Box", baseQuantity: 1, scalingRule: "per_ingredient" as const },
  ];

  const context = { stationCount: 4, spiritCount: 3, ingredientCount: 8 };

  it("scales per_station items by station count", () => {
    const result = scaleEquipment(baseItems, context);
    expect(result.find((r) => r.itemName === "Boston Shaker")?.quantity).toBe(4);
  });

  it("keeps fixed items unchanged", () => {
    const result = scaleEquipment(baseItems, context);
    expect(result.find((r) => r.itemName === "First Aid Kit")?.quantity).toBe(1);
  });

  it("scales per_spirit items by distinct spirit count", () => {
    const result = scaleEquipment(baseItems, context);
    expect(result.find((r) => r.itemName === "Store N Pour")?.quantity).toBe(3);
  });

  it("scales per_ingredient items by ingredient count", () => {
    const result = scaleEquipment(baseItems, context);
    expect(result.find((r) => r.itemName === "Garnish Box")?.quantity).toBe(8);
  });

  it("defaults to 1 when stationCount is 0", () => {
    const result = scaleEquipment(baseItems, { stationCount: 0, spiritCount: 3, ingredientCount: 8 });
    expect(result.find((r) => r.itemName === "Boston Shaker")?.quantity).toBe(1);
  });

  it("scales baseQuantity > 1 correctly", () => {
    const items = [{ itemName: "Ice Scoop", baseQuantity: 2, scalingRule: "per_station" as const }];
    const result = scaleEquipment(items, { stationCount: 3, spiritCount: 0, ingredientCount: 0 });
    expect(result.find((r) => r.itemName === "Ice Scoop")?.quantity).toBe(6);
  });

  it("returns empty array for empty items", () => {
    expect(scaleEquipment([], context)).toEqual([]);
  });
});
