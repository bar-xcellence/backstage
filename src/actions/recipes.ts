"use server";

import { db } from "@/db";
import { cocktails, cocktailIngredients, cocktailGarnishes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/session";

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
