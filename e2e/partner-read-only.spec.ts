import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.describe("partner read-only", () => {
  test("sees events list with no edit affordances", async ({ page }) => {
    await signInAs(page, "partner", "/events");

    await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();

    await expect(page.getByRole("link", { name: /ADD EVENT/i })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /CREATE YOUR FIRST EVENT/i })
    ).toHaveCount(0);
  });

  test("lands on the new partner dashboard at /", async ({ page }) => {
    await signInAs(page, "partner", "/");
    await expect(page).toHaveURL(/\/(\?|$)/);
    // Owner-only top-half should not render
    await expect(page.getByRole("heading", { name: /needs attention/i })).toHaveCount(0);
  });

  test("event detail hides financial fields and edit controls", async ({ page }) => {
    await signInAs(page, "partner", "/events");

    const firstEventLink = page.locator('a[href^="/events/"]').first();

    if ((await firstEventLink.count()) === 0) {
      test.skip(true, "no confirmed events visible to partner — nothing to inspect");
      return;
    }

    await firstEventLink.click();
    await page.waitForURL(/\/events\/[0-9a-f-]+/i);

    await expect(page.getByText(/invoice amount/i)).toHaveCount(0);
    await expect(page.getByText(/cost amount/i)).toHaveCount(0);
    await expect(page.getByText(/stock return policy/i)).toHaveCount(0);
    await expect(page.getByText(/card payment commission/i)).toHaveCount(0);

    await expect(page.getByRole("link", { name: /edit/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /send to lc/i })).toHaveCount(0);
  });

  test("event detail hides owner-only operational sections", async ({ page }) => {
    await signInAs(page, "partner", "/events");

    const firstEventLink = page.locator('a[href^="/events/"]').first();
    if ((await firstEventLink.count()) === 0) {
      test.skip(true, "no partner-visible events seeded — nothing to inspect");
      return;
    }
    await firstEventLink.click();
    await page.waitForURL(/\/events\/[0-9a-f-]+/i);

    // Owner-only sections (h2 headings) must not render for partner
    await expect(page.getByRole("heading", { name: /^Times$/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Batching$/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Pop-up Bar$/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Install Instructions$/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /^Notes$/ })).toHaveCount(0);

    // Brief-sent timestamp leaked operational signal — must not appear
    await expect(page.getByText(/SENT TO LC/i)).toHaveCount(0);

    // Raw DB workflow statuses must never reach partner
    await expect(page.getByText(/^preparation$/i)).toHaveCount(0);
    await expect(page.getByText(/^ready$/i)).toHaveCount(0);
    await expect(page.getByText(/^enquiry$/i)).toHaveCount(0);
  });

  test("sidebar has a Dashboard link for partner", async ({ page }) => {
    await signInAs(page, "partner", "/");
    await expect(
      page.getByRole("link", { name: /^DASHBOARD$/i })
    ).toBeVisible();
  });

  test("event detail shows LC Payout section to partner", async ({ page }) => {
    await signInAs(page, "partner", "/events");

    const firstEventLink = page.locator('a[href^="/events/"]').first();
    if ((await firstEventLink.count()) === 0) {
      test.skip(true, "no partner-visible events seeded — nothing to inspect");
      return;
    }

    await firstEventLink.click();
    await page.waitForURL(/\/events\/[0-9a-f-]+/i);

    await expect(
      page.getByRole("heading", { name: /^LC Payout$/i })
    ).toBeVisible();
    // Payout figure formatted as GBP (£ symbol + digits)
    await expect(page.getByText(/£[\d,]+/)).toBeVisible();
  });
});
