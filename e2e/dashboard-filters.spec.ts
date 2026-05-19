import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test.describe("dashboard filters", () => {
  test("changing month updates URL and re-fetches cards", async ({ page }) => {
    await signInAs(page, "owner", "/");

    const monthSelect = page.getByLabel("Month");
    await monthSelect.waitFor({ state: "visible" });

    // Pick the first option whose value differs from the currently-selected one.
    const currentValue = await monthSelect.inputValue();
    const optionValues = await monthSelect.locator("option").evaluateAll((els) =>
      (els as HTMLOptionElement[]).map((el) => el.value)
    );
    const otherValue = optionValues.find((v) => v && v !== currentValue);
    if (!otherValue) {
      throw new Error("Month select has no alternative option to switch to");
    }
    await monthSelect.selectOption(otherValue);

    await expect(page).toHaveURL(/\?.*month=/);
  });

  test("toggling a status chip updates URL", async ({ page }) => {
    await signInAs(page, "owner", "/");

    // Toggle 'Cancelled' on (off by default for owner)
    const cancelledChip = page.getByRole("button", { name: /^Cancelled$/i });
    await cancelledChip.waitFor({ state: "visible" });
    await cancelledChip.click();

    await expect(page).toHaveURL(/statuses=.*cancelled/);
  });

  test("attempting to deselect the last status chip is resisted", async ({ page }) => {
    await signInAs(page, "owner", "/?statuses=confirmed");

    // Only 'Confirmed' is selected. Clicking it should NOT remove the query param.
    const confirmedChip = page.getByRole("button", { name: /^Confirmed$/i });
    await confirmedChip.click();

    // URL should still contain statuses=confirmed
    await expect(page).toHaveURL(/statuses=confirmed/);
  });
});
