import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRecipe, updateRecipe } from "@/actions/recipes";
import { RecipeForm } from "@/components/recipes/recipe-form";
import type { RecipeInput } from "@/lib/recipe-validation";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  if (session.role !== "owner" && session.role !== "super_admin") {
    redirect("/recipes");
  }

  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const initial: RecipeInput = {
    name: recipe.name,
    defaultMenuName: recipe.defaultMenuName,
    defaultMenuDescription: recipe.defaultMenuDescription,
    season: recipe.season ?? "all_year",
    glassType: recipe.glassType ?? "rocks",
    category: recipe.category,
    iceType: recipe.iceType,
    iceAmountG: recipe.iceAmountG,
    straw: recipe.straw ?? false,
    strawType: recipe.strawType,
    isNonAlcoholic: recipe.isNonAlcoholic ?? false,
    notes: recipe.notes,
    referenceImageUrl: recipe.referenceImageUrl,
    ingredients: recipe.ingredients.map((ing) => ({
      ingredientName: ing.ingredientName,
      ingredientCategory: ing.ingredientCategory ?? "other",
      amount: ing.amount,
      unit: ing.unit,
      brand: ing.brand,
      isOptional: ing.isOptional ?? false,
    })),
    garnishes: recipe.garnishes.map((g) => ({
      garnishName: g.garnishName,
      garnishCategory: g.garnishCategory ?? "fruit",
      quantity: g.quantity,
      quantityUnit: g.quantityUnit ?? "piece",
    })),
  };

  const updateAction = updateRecipe.bind(null, id);

  return (
    <div className="max-w-3xl">
      <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight mb-6">
        Edit Recipe
      </h1>
      <RecipeForm initial={initial} action={updateAction} submitLabel="SAVE CHANGES" />
    </div>
  );
}
