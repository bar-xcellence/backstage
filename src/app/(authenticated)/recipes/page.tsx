import Link from "next/link";
import { listRecipes } from "@/actions/recipes";

const SEASONS = [
  { label: "ALL", value: "all" },
  { label: "SPRING", value: "spring" },
  { label: "SUMMER", value: "summer" },
  { label: "AUTUMN", value: "autumn" },
  { label: "WINTER", value: "winter" },
];

const GLASS_LABELS: Record<string, string> = {
  rocks: "Rocks",
  coupe: "Coupe",
  highball: "Highball",
  martini: "Martini",
  flute: "Flute",
  polycarb_rocks: "Polycarb Rocks",
  other: "Other",
};

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const recipes = await listRecipes(season);

  return (
    <div>
      {/* Header */}
      <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal tracking-tight mb-6">
        Recipe Library
      </h1>

      {/* Season filter */}
      <div className="flex gap-2 mb-8">
        {SEASONS.map((s) => {
          const isActive = (season || "all") === s.value;
          return (
            <Link
              key={s.value}
              href={s.value === "all" ? "/recipes" : `/recipes?season=${s.value}`}
              className={`px-4 py-1.5 font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 min-h-[36px] flex items-center ${
                isActive
                  ? "bg-gold text-cream"
                  : "bg-surface-low text-grey hover:text-charcoal"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Recipe grid */}
      {recipes.length === 0 ? (
        <p className="text-grey text-sm font-[family-name:var(--font-raleway)]">
          No recipes found for this season
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="group block bg-cream border border-transparent hover:border-gold/40 transition-colors duration-200 overflow-hidden"
            >
              {/* Image placeholder */}
              <div className="aspect-[4/3] bg-surface-low flex items-center justify-center">
                {recipe.referenceImageUrl ? (
                  <img
                    src={recipe.referenceImageUrl}
                    alt={recipe.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <span className="font-[family-name:var(--font-cormorant)] text-xl font-light text-grey/30">
                    {recipe.name[0]}
                  </span>
                )}
              </div>

              {/* Card content */}
              <div className="p-4">
                <h3 className="font-[family-name:var(--font-raleway)] text-base font-semibold text-charcoal">
                  {recipe.defaultMenuName}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-grey">
                    {recipe.season?.replace("_", " ")}
                  </span>
                  <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-grey">
                    {GLASS_LABELS[recipe.glassType || "other"]}
                  </span>
                  {recipe.isNonAlcoholic && (
                    <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-botanical">
                      NA
                    </span>
                  )}
                </div>
                {recipe.defaultMenuDescription && (
                  <p className="font-[family-name:var(--font-cormorant)] text-sm italic text-gold-ink/70 mt-2 line-clamp-2">
                    {recipe.defaultMenuDescription}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-grey/40 text-[10px] font-[family-name:var(--font-raleway)] tracking-[0.16em] uppercase mt-8">
        Showing {recipes.length} of {recipes.length} recipes
      </p>
    </div>
  );
}
