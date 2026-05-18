import { describe, it, expect } from "vitest";
import { canManageEventCocktails } from "./role-permissions";

describe("canManageEventCocktails", () => {
  it("allows owner to manage (add/remove/edit) event cocktails", () => {
    expect(canManageEventCocktails("owner")).toBe(true);
  });

  it("allows super_admin to manage event cocktails", () => {
    expect(canManageEventCocktails("super_admin")).toBe(true);
  });

  it("denies partner from managing event cocktails", () => {
    expect(canManageEventCocktails("partner")).toBe(false);
  });
});
