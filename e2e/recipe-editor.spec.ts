import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers/auth";

function uniqueRecipeName(prefix: string): string {
  return `E2E_Recipe_${prefix}_${Date.now()}`;
}

test.describe("recipe editor", () => {
  test("owner can create a recipe and it appears on the library", async ({
    page,
  }) => {
    await signInAs(page, "owner", "/recipes/new");

    const recipeName = uniqueRecipeName("Create");
    const menuName = `Menu_${recipeName}`;

    await page.getByLabel("Recipe name").fill(recipeName);
    await page.getByLabel("Menu name").fill(menuName);

    // Fill the first ingredient row
    await page
      .getByRole("textbox", { name: "Ingredient name" })
      .first()
      .fill("Rum");
    await page
      .getByRole("textbox", { name: "Ingredient amount" })
      .first()
      .fill("50");

    await page.getByRole("button", { name: "CREATE RECIPE" }).click();

    // Should redirect to /recipes/<uuid>
    await page.waitForURL((url) => /\/recipes\/[0-9a-f-]+$/i.test(url.pathname));

    // Verify the menu name is on the detail page (h1 shows defaultMenuName)
    await expect(page.getByRole("heading", { name: menuName })).toBeVisible();

    // Navigate to the library and confirm the card is present
    await page.goto("/recipes");
    await expect(page.getByText(menuName)).toBeVisible();
  });

  test("owner can edit a recipe and the updated name shows on the detail page", async ({
    page,
  }) => {
    // Create a recipe first via the form
    await signInAs(page, "owner", "/recipes/new");

    const recipeName = uniqueRecipeName("Edit");
    const menuName = `Menu_${recipeName}`;
    const updatedMenuName = `Updated_${menuName}`;

    await page.getByLabel("Recipe name").fill(recipeName);
    await page.getByLabel("Menu name").fill(menuName);
    await page.getByRole("textbox", { name: "Ingredient name" }).first().fill("Gin");
    await page.getByRole("textbox", { name: "Ingredient amount" }).first().fill("45");
    await page.getByRole("button", { name: "CREATE RECIPE" }).click();

    await page.waitForURL((url) => /\/recipes\/[0-9a-f-]+$/i.test(url.pathname));

    // Click Edit
    await page.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL((url) => /\/recipes\/[0-9a-f-]+\/edit$/i.test(url.pathname));

    // Change the menu name
    const menuNameInput = page.getByLabel("Menu name");
    await menuNameInput.clear();
    await menuNameInput.fill(updatedMenuName);

    await page.getByRole("button", { name: "SAVE CHANGES" }).click();

    // Should redirect back to the detail page
    await page.waitForURL((url) => /\/recipes\/[0-9a-f-]+$/i.test(url.pathname));

    // Updated menu name is visible as the heading
    await expect(
      page.getByRole("heading", { name: updatedMenuName })
    ).toBeVisible();
  });

  test("owner can duplicate a recipe and is taken to the edit page prefilled with 'Copy of'", async ({
    page,
  }) => {
    // Create a source recipe
    await signInAs(page, "owner", "/recipes/new");

    const recipeName = uniqueRecipeName("Duplicate");
    const menuName = `Menu_${recipeName}`;

    await page.getByLabel("Recipe name").fill(recipeName);
    await page.getByLabel("Menu name").fill(menuName);
    await page.getByRole("textbox", { name: "Ingredient name" }).first().fill("Vodka");
    await page.getByRole("textbox", { name: "Ingredient amount" }).first().fill("50");
    await page.getByRole("button", { name: "CREATE RECIPE" }).click();

    await page.waitForURL((url) => /\/recipes\/[0-9a-f-]+$/i.test(url.pathname));

    // Click Duplicate
    await page.getByRole("button", { name: "Duplicate" }).click();

    // Should redirect to /recipes/<new-uuid>/edit
    await page.waitForURL(
      (url) => /\/recipes\/[0-9a-f-]+\/edit$/i.test(url.pathname)
    );

    // Recipe name field should start with "Copy of "
    await expect(page.getByLabel("Recipe name")).toHaveValue(
      new RegExp(`^Copy of `)
    );
  });

  test("owner can archive a recipe and it disappears from the library", async ({
    page,
  }) => {
    // Create a recipe to archive
    await signInAs(page, "owner", "/recipes/new");

    const recipeName = uniqueRecipeName("Archive");
    const menuName = `Menu_${recipeName}`;

    await page.getByLabel("Recipe name").fill(recipeName);
    await page.getByLabel("Menu name").fill(menuName);
    await page.getByRole("textbox", { name: "Ingredient name" }).first().fill("Tequila");
    await page.getByRole("textbox", { name: "Ingredient amount" }).first().fill("60");
    await page.getByRole("button", { name: "CREATE RECIPE" }).click();

    await page.waitForURL((url) => /\/recipes\/[0-9a-f-]+$/i.test(url.pathname));

    // Accept the confirm dialog and click Archive
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Archive" }).click();

    // Should redirect to /recipes
    await page.waitForURL((url) => url.pathname === "/recipes");

    // Archived recipe's menu name should no longer appear in the library
    await expect(page.getByText(menuName)).toHaveCount(0);
  });

  test("partner does not see 'New recipe' link on the library", async ({
    page,
  }) => {
    await signInAs(page, "partner", "/recipes");

    // The "New recipe" button is only shown to owner/super_admin
    await expect(page.getByRole("link", { name: /new recipe/i })).toHaveCount(0);
  });
});
