"use server";

import { db } from "@/db";
import { cocktails, cocktailIngredients, cocktailGarnishes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateRecipeInput, type RecipeInput } from "@/lib/recipe-validation";

export async function listRecipes(seasonFilter?: string) {
  await requireRole("owner", "super_admin", "partner");

  const allRecipes = await db
    .select()
    .from(cocktails)
    .where(eq(cocktails.isActive, true))
    .orderBy(desc(cocktails.createdAt));

  if (seasonFilter && seasonFilter !== "all") {
    return allRecipes.filter(
      (r) => r.season === seasonFilter || r.season === "all_year"
    );
  }

  return allRecipes;
}

export async function getRecipe(id: string) {
  await requireRole("owner", "super_admin", "partner");

  const [recipe] = await db
    .select()
    .from(cocktails)
    .where(eq(cocktails.id, id))
    .limit(1);

  if (!recipe) return null;

  const ingredients = await db
    .select()
    .from(cocktailIngredients)
    .where(eq(cocktailIngredients.cocktailId, id))
    .orderBy(cocktailIngredients.sortOrder);

  const garnishes = await db
    .select()
    .from(cocktailGarnishes)
    .where(eq(cocktailGarnishes.cocktailId, id))
    .orderBy(cocktailGarnishes.sortOrder);

  return { ...recipe, ingredients, garnishes };
}

async function insertChildren(
  cocktailId: string,
  input: Pick<RecipeInput, "ingredients" | "garnishes">
) {
  if (input.ingredients.length > 0) {
    await db.insert(cocktailIngredients).values(
      input.ingredients.map((ing, i) => ({
        cocktailId,
        ingredientName: ing.ingredientName.trim(),
        ingredientCategory:
          ing.ingredientCategory as (typeof cocktailIngredients.ingredientCategory.enumValues)[number],
        amount: ing.amount,
        unit: ing.unit as (typeof cocktailIngredients.unit.enumValues)[number],
        brand: ing.brand?.trim() || null,
        isOptional: ing.isOptional,
        sortOrder: i,
      }))
    );
  }
  if (input.garnishes.length > 0) {
    await db.insert(cocktailGarnishes).values(
      input.garnishes.map((g, i) => ({
        cocktailId,
        garnishName: g.garnishName.trim(),
        garnishCategory:
          g.garnishCategory as (typeof cocktailGarnishes.garnishCategory.enumValues)[number],
        quantity: g.quantity,
        quantityUnit: g.quantityUnit.trim() || "piece",
        sortOrder: i,
      }))
    );
  }
}

function cocktailRow(input: RecipeInput) {
  return {
    name: input.name.trim(),
    defaultMenuName: input.defaultMenuName.trim(),
    defaultMenuDescription: input.defaultMenuDescription?.trim() || null,
    season: input.season as (typeof cocktails.season.enumValues)[number],
    glassType: input.glassType as (typeof cocktails.glassType.enumValues)[number],
    category: input.category?.trim() || null,
    iceType: input.iceType?.trim() || null,
    iceAmountG: input.iceAmountG,
    straw: input.straw,
    strawType: input.strawType?.trim() || null,
    isNonAlcoholic: input.isNonAlcoholic,
    notes: input.notes?.trim() || null,
    referenceImageUrl: input.referenceImageUrl?.trim() || null,
  };
}

export async function createRecipe(input: RecipeInput): Promise<{ errors: string[] }> {
  await requireRole("owner", "super_admin");
  const errors = validateRecipeInput(input);
  if (errors.length > 0) return { errors };
  const [inserted] = await db
    .insert(cocktails)
    .values(cocktailRow(input))
    .returning({ id: cocktails.id });
  await insertChildren(inserted.id, input);
  revalidatePath("/recipes");
  redirect(`/recipes/${inserted.id}`);
}

export async function updateRecipe(id: string, input: RecipeInput): Promise<{ errors: string[] }> {
  await requireRole("owner", "super_admin");
  const errors = validateRecipeInput(input);
  if (errors.length > 0) return { errors };
  await db
    .update(cocktails)
    .set({ ...cocktailRow(input), updatedAt: new Date() })
    .where(eq(cocktails.id, id));
  // neon-http has no transactions: replace children with delete-then-insert.
  await db.delete(cocktailIngredients).where(eq(cocktailIngredients.cocktailId, id));
  await db.delete(cocktailGarnishes).where(eq(cocktailGarnishes.cocktailId, id));
  await insertChildren(id, input);
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

export async function archiveRecipe(id: string): Promise<void> {
  await requireRole("owner", "super_admin");
  const existing = await getRecipe(id);
  if (!existing) redirect("/recipes");
  await db.update(cocktails).set({ isActive: false }).where(eq(cocktails.id, id));
  revalidatePath("/recipes");
  redirect("/recipes");
}

export async function duplicateRecipe(id: string): Promise<void> {
  await requireRole("owner", "super_admin");
  const source = await getRecipe(id);
  if (!source) redirect("/recipes");
  const [clone] = await db
    .insert(cocktails)
    .values({
      name: `Copy of ${source.name}`,
      defaultMenuName: `Copy of ${source.defaultMenuName}`,
      defaultMenuDescription: source.defaultMenuDescription,
      season: source.season,
      glassType: source.glassType,
      category: source.category,
      iceType: source.iceType,
      iceAmountG: source.iceAmountG,
      straw: source.straw,
      strawType: source.strawType,
      isNonAlcoholic: source.isNonAlcoholic,
      notes: source.notes,
      referenceImageUrl: source.referenceImageUrl,
    })
    .returning({ id: cocktails.id });
  await insertChildren(clone.id, {
    ingredients: source.ingredients.map((ing) => ({
      ingredientName: ing.ingredientName,
      ingredientCategory: ing.ingredientCategory ?? "other",
      amount: ing.amount,
      unit: ing.unit,
      brand: ing.brand,
      isOptional: ing.isOptional ?? false,
    })),
    garnishes: source.garnishes.map((g) => ({
      garnishName: g.garnishName,
      garnishCategory: g.garnishCategory ?? "fruit",
      quantity: g.quantity,
      quantityUnit: g.quantityUnit ?? "piece",
    })),
  });
  revalidatePath("/recipes");
  redirect(`/recipes/${clone.id}/edit`);
}
