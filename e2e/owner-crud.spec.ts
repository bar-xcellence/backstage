import { test, expect } from "@playwright/test";
import { signInAs, uniqueEventName } from "./helpers/auth";

test.describe("owner CRUD", () => {
  test("creates an event and views it on the detail page", async ({ page }) => {
    await signInAs(page, "owner", "/events");

    await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();
    await page.getByRole("link", { name: /ADD EVENT|CREATE YOUR FIRST EVENT/ }).click();

    await page.waitForURL("**/events/new");

    const eventName = uniqueEventName("OwnerCRUD");
    await page.locator('input[name="eventName"]').fill(eventName);
    await page.locator('input[name="showName"]').fill("Playwright Smoke");
    await page.locator('input[name="eventDate"]').fill("2027-01-15");
    await page.locator('input[name="guestCount"]').fill("100");
    await page.locator('input[name="venueName"]').fill("Test Venue");

    await page.getByRole("button", { name: /SAVE|CREATE EVENT/i }).click();

    await page.waitForURL((url) => /\/events\/[0-9a-f-]+/i.test(url.pathname));
    await expect(page.getByText(eventName)).toBeVisible();
    await expect(page.getByText("Test Venue")).toBeVisible();
  });
});
