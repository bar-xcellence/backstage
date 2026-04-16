import { describe, it, expect } from "vitest";
import { getTemplateItems } from "@/db/checklist-templates";

describe("Checklist Templates", () => {
  it("returns 8 base items for corporate events", () => {
    const items = getTemplateItems("corporate");
    expect(items).toHaveLength(8);
    expect(items[0].label).toBe("Contact details confirmed");
    expect(items[7].label).toBe("Attire communicated");
  });

  it("returns 12 items for exhibition events (8 base + 4 extra)", () => {
    const items = getTemplateItems("exhibition");
    expect(items).toHaveLength(12);
    expect(items[8].label).toBe("Banner stand packed");
    expect(items[11].label).toBe("Signage prepared");
  });

  it("returns items in sorted order", () => {
    const items = getTemplateItems("exhibition");
    for (let i = 1; i < items.length; i++) {
      expect(items[i].sortOrder).toBeGreaterThan(items[i - 1].sortOrder);
    }
  });
});
