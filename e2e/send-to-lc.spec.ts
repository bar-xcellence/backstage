import { test, expect } from "@playwright/test";
import { signInAs, uniqueEventName } from "./helpers/auth";

test.describe("send to LC", () => {
  test("owner sees the Send to LC button on a new event", async ({ page }) => {
    await signInAs(page, "owner", "/events/new");

    const eventName = uniqueEventName("SendToLC");
    await page.locator('input[name="eventName"]').fill(eventName);
    await page.locator('input[name="showName"]').fill("Send-to-LC Smoke");
    await page.locator('input[name="eventDate"]').fill("2027-02-20");
    await page.locator('input[name="guestCount"]').fill("80");
    await page.locator('input[name="venueName"]').fill("Test Venue");

    await page.getByRole("button", { name: /SAVE|CREATE EVENT/i }).click();
    await page.waitForURL(/\/events\/[0-9a-f-]+/i);

    await expect(page.getByText(eventName)).toBeVisible();

    const sendButton = page.getByRole("button", { name: /SEND TO LC/i });
    await expect(sendButton).toBeVisible();
  });
});
