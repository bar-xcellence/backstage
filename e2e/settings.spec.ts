import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.describe("settings", () => {
  test("owner can open Settings and sees both sections", async ({ page }) => {
    await signInAs(page, "owner", "/settings");

    await expect(
      page.getByRole("heading", { name: "Settings", exact: true })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /From address/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Saved LC recipients/i })
    ).toBeVisible();
  });

  test("super_admin can open Settings", async ({ page }) => {
    await signInAs(page, "superAdmin", "/settings");
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true })
    ).toBeVisible();
  });

  test("partner is redirected away from /settings", async ({ page }) => {
    await signInAs(page, "partner", "/settings");
    // Should land on /events (not /settings)
    await expect(page).toHaveURL(/\/events(\/|$)/);
  });

  test("partner does not see the Settings nav entry", async ({ page }) => {
    await signInAs(page, "partner", "/events");
    // Nav: should NOT contain SETTINGS link
    const settingsLink = page.getByRole("link", { name: /SETTINGS/i });
    await expect(settingsLink).toHaveCount(0);
  });

  test("seeded Rory recipient is listed and at least one row is the Default To", async ({
    page,
  }) => {
    await signInAs(page, "owner", "/settings");
    await expect(page.getByText("Rory · LC")).toBeVisible();
    await expect(page.getByText("rory@lc-group.com").first()).toBeVisible();
    await expect(page.getByText("Default To").first()).toBeVisible();
  });
});
