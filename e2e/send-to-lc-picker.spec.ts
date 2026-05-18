import { test, expect } from "@playwright/test";
import { signInAs, uniqueEventName } from "./helpers/auth";

test.describe("send to LC — recipients picker", () => {
  test("brief preview slide-over shows the recipients panel pre-filled from the event default", async ({
    page,
  }) => {
    await signInAs(page, "owner", "/events/new");

    const eventName = uniqueEventName("Picker");
    await page.locator('input[name="eventName"]').fill(eventName);
    await page.locator('input[name="eventDate"]').fill("2027-03-12");
    await page.locator('input[name="guestCount"]').fill("60");
    await page.locator('input[name="venueName"]').fill("Picker Test Venue");
    await page.getByRole("button", { name: /SAVE|CREATE EVENT/i }).click();
    await page.waitForURL(/\/events\/[0-9a-f-]+/i);

    await page.getByRole("button", { name: /^SEND TO LC$/i }).click();

    // Recipients panel appears
    await expect(
      page.getByRole("heading", { name: /Recipients/i })
    ).toBeVisible();

    // To select is populated with whatever the current default recipient is
    const toSelect = page.locator("#brief-to");
    await expect(toSelect).toBeVisible();
    const toValue = await toSelect.inputValue();
    expect(toValue).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

    // Switch to custom email entry and verify the input shows
    await page.getByRole("button", { name: /Type custom/i }).click();
    const customInput = page.locator("#brief-to");
    await customInput.fill("ad-hoc@example.com");
    await expect(customInput).toHaveValue("ad-hoc@example.com");

    // CC input present
    await expect(page.locator("#brief-cc")).toBeVisible();
  });

  test("adding an ad-hoc CC creates a tag", async ({ page }) => {
    await signInAs(page, "owner", "/events/new");

    const eventName = uniqueEventName("PickerCC");
    await page.locator('input[name="eventName"]').fill(eventName);
    await page.locator('input[name="eventDate"]').fill("2027-03-13");
    await page.locator('input[name="guestCount"]').fill("60");
    await page.locator('input[name="venueName"]').fill("CC Test Venue");
    await page.getByRole("button", { name: /SAVE|CREATE EVENT/i }).click();
    await page.waitForURL(/\/events\/[0-9a-f-]+/i);

    await page.getByRole("button", { name: /^SEND TO LC$/i }).click();

    const ccInput = page.locator("#brief-cc");
    await ccInput.fill("copy@example.com");
    await ccInput.press("Enter");

    await expect(page.getByText("copy@example.com")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Remove copy@example.com" })
    ).toBeVisible();
  });
});
