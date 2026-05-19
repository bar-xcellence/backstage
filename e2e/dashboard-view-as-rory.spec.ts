import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.describe("view-as-rory preview", () => {
  test("owner sees banner and partner card variant when ?viewAs=partner", async ({ page }) => {
    await signInAs(page, "owner", "/?viewAs=partner");

    // Sticky banner
    await expect(page.getByText(/viewing as: rory/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /exit preview/i })).toBeVisible();

    // Owner-only blocks must be hidden
    await expect(page.getByText(/events? this week/i)).toHaveCount(0);
    await expect(page.getByText(/^INVOICE$/i)).toHaveCount(0);
    await expect(page.getByText(/^MARGIN$/i)).toHaveCount(0);
  });

  test("exit preview returns to real owner view", async ({ page }) => {
    await signInAs(page, "owner", "/?viewAs=partner");
    await page.getByRole("link", { name: /exit preview/i }).click();
    await page.waitForURL(/^.*\/$/);
    // The owner greeting is always visible after exit
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible();
    // The view-as banner is gone
    await expect(page.getByText(/viewing as: rory/i)).toHaveCount(0);
  });

  test("partner with ?viewAs=partner sees no banner (param ignored)", async ({ page }) => {
    await signInAs(page, "partner", "/?viewAs=partner");
    await expect(page.getByText(/viewing as: rory/i)).toHaveCount(0);
  });
});
