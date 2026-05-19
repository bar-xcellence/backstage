import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.describe("partner dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, "partner", "/");
  });

  test("renders month header, summary strip, and at least one card", async ({ page }) => {
    await expect(page.getByText(/\d{4}/)).toBeVisible(); // some month label like JUNE 2026
    await expect(page.getByText(/confirmed/i).first()).toBeVisible();
  });

  test("does not show any owner-only labels anywhere", async ({ page }) => {
    // Owner-only labels from the card footer
    await expect(page.getByText(/^INVOICE$/i)).toHaveCount(0);
    await expect(page.getByText(/^COST$/i)).toHaveCount(0);
    await expect(page.getByText(/^MARGIN$/i)).toHaveCount(0);
    await expect(page.getByText(/^Brief:/i)).toHaveCount(0);
    await expect(page.getByText(/^Checklist:/i)).toHaveCount(0);
    await expect(page.getByText(/^T-\d+ DAYS$/)).toHaveCount(0);

    // KPI strip
    await expect(page.getByRole("heading", { name: /needs attention/i })).toHaveCount(0);
  });

  test("cards are not links", async ({ page }) => {
    // Wait for at least one event date to render (e.g. "3 JUN" or "JUNE")
    const monthLabel = page.locator("text=/JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC/").first();
    await monthLabel.waitFor({ state: "visible" });

    // The card body must not be wrapped in <a href="/events/...">
    const eventLinks = page.locator('a[href^="/events/"]');
    await expect(eventLinks).toHaveCount(0);
  });
});
