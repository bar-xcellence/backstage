import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createRecipe } from "@/actions/recipes";
import { RecipeForm } from "@/components/recipes/recipe-form";

export default async function NewRecipePage() {
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  if (session.role !== "owner" && session.role !== "super_admin") {
    redirect("/recipes");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight mb-6">
        New Recipe
      </h1>
      <RecipeForm action={createRecipe} submitLabel="CREATE RECIPE" />
    </div>
  );
}
