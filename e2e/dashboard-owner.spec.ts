import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.describe("owner dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, "owner", "/");
  });

  test("renders owner greeting and month header", async ({ page }) => {
    // Greeting always renders, with time-of-day prefix
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible();
    // Month header eyebrow (e.g. "MAY 2026 · 1 EVENT")
    await expect(
      page.locator("text=/^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER) \\d{4} ·/")
    ).toBeVisible();
  });

  test("owner cards show financial figures and link to detail", async ({ page }) => {
    // Wait for cards to render
    const firstCardLink = page.locator('a[href^="/events/"]').first();
    await firstCardLink.waitFor({ state: "visible" });

    // At least one card has the INVOICE / COST / MARGIN / PAYOUT labels
    await expect(page.getByText(/^INVOICE$/i).first()).toBeVisible();
    await expect(page.getByText(/^COST$/i).first()).toBeVisible();
    await expect(page.getByText(/^MARGIN$/i).first()).toBeVisible();
    await expect(page.getByText(/^PAYOUT$/i).first()).toBeVisible();
  });

  test("clicking a card navigates to event detail", async ({ page }) => {
    // Filter out the DashboardClient zero-state "Add your first event" link.
    const firstCardLink = page.locator('a[href^="/events/"]:not([href="/events/new"])').first();
    await firstCardLink.waitFor({ state: "visible" });
    await firstCardLink.click();
    await page.waitForURL(/\/events\/[0-9a-f-]+/i);
  });
});
