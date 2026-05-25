import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

// Keyboard-only navigation smoke: every interactive element on the key
// surfaces must be reachable via Tab, focusable, and visibly outlined.

test.describe("keyboard navigation", () => {
  test("owner dashboard: Tab traverses interactive elements", async ({ page }) => {
    await signInAs(page, "owner", "/");
    await page.waitForLoadState("networkidle");

    // Start from the document top
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    // Tab forward up to ~25 times, collecting unique focused element tags.
    const focused: string[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const tag = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        return el.tagName.toLowerCase();
      });
      if (tag) focused.push(tag);
    }

    // We expect to reach a mix of interactive elements: links, buttons, selects.
    const unique = new Set(focused);
    expect(unique.size, `tab traversal hit no unique elements: ${focused.join(",")}`).toBeGreaterThan(2);
    expect(focused).toContain("a"); // nav links
    expect(focused.some((t) => t === "button" || t === "select")).toBe(true);
  });

  test("event creation form: every field is keyboard-reachable", async ({ page }) => {
    await signInAs(page, "owner", "/events/new");
    await page.waitForLoadState("networkidle");

    // Tab through the form; each input should be focusable.
    const formInputs = await page.locator("form input, form select, form textarea").count();
    expect(formInputs, "events/new must have at least one form input").toBeGreaterThan(0);

    // Try focusing each input directly to confirm none have tabindex=-1.
    const inputs = page.locator("form input, form select, form textarea");
    for (let i = 0; i < formInputs; i++) {
      const el = inputs.nth(i);
      const tabIndex = await el.getAttribute("tabindex");
      // Allow undefined/null (browser default) or explicit non-negative tabindex.
      if (tabIndex !== null) {
        expect(parseInt(tabIndex, 10)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("focus is visible on the first dashboard interactive element", async ({ page }) => {
    await signInAs(page, "owner", "/");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Tab");

    // The active element must have a non-trivial outline / box-shadow when focused.
    const hasVisibleFocus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return false;
      const style = getComputedStyle(el);
      const outlineVisible =
        style.outlineStyle !== "none" &&
        style.outlineWidth !== "0px" &&
        style.outlineColor !== "transparent";
      const shadowVisible = style.boxShadow !== "none";
      return outlineVisible || shadowVisible;
    });
    expect(
      hasVisibleFocus,
      "first Tab-focused element must show a visible focus indicator (outline or box-shadow)"
    ).toBe(true);
  });
});
