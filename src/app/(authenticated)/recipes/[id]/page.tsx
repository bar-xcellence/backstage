import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/actions/recipes";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) notFound();

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/recipes"
          className="text-grey hover:text-charcoal text-sm transition-colors duration-200"
        >
          &larr;
        </Link>
        <div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight">
            {recipe.defaultMenuName}
          </h1>
          {recipe.defaultMenuDescription && (
            <p className="font-[family-name:var(--font-cormorant)] text-base italic text-gold-ink/70 mt-1">
              {recipe.defaultMenuDescription}
            </p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 mb-8 font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey">
        <span>{recipe.season?.replace("_", " ")}</span>
        <span>{recipe.glassType}</span>
        {recipe.iceType && <span>{recipe.iceType} ice</span>}
        {recipe.isNonAlcoholic && <span className="text-botanical">Non-alcoholic</span>}
        {recipe.straw && <span>Straw: {recipe.strawType || "yes"}</span>}
      </div>

      {/* Ingredients */}
      <section className="mb-8">
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-4">
          Ingredients
        </h2>
        <div className="space-y-2">
          {recipe.ingredients.map((ing) => (
            <div
              key={ing.id}
              className="flex items-center justify-between py-2 border-b border-outline/10"
            >
              <div>
                <span className="font-[family-name:var(--font-raleway)] text-sm text-charcoal">
                  {ing.ingredientName}
                </span>
                {ing.brand && (
                  <span className="ml-2 font-[family-name:var(--font-raleway)] text-[11px] text-grey">
                    ({ing.brand})
                  </span>
                )}
              </div>
              <span className="font-[family-name:var(--font-raleway)] text-sm text-gold-ink font-medium">
                {ing.amount}
                {ing.unit}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Garnishes */}
      {recipe.garnishes.length > 0 && (
        <section className="mb-8">
          <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-4">
            Garnish
          </h2>
          <div className="space-y-2">
            {recipe.garnishes.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between py-2 border-b border-outline/10"
              >
                <span className="font-[family-name:var(--font-raleway)] text-sm text-charcoal">
                  {g.garnishName}
                </span>
                <span className="font-[family-name:var(--font-raleway)] text-sm text-gold-ink font-medium">
                  {g.quantity} {g.quantityUnit}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      {recipe.notes && (
        <section>
          <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-4">
            Notes
          </h2>
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey leading-relaxed">
            {recipe.notes}
          </p>
        </section>
      )}
    </div>
  );
}
