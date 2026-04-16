import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  users,
  cocktails,
  cocktailIngredients,
  cocktailGarnishes,
} from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  console.log("Seeding database...");

  // ── Users ──────────────────────────────────────────
  console.log("Seeding users...");
  await db
    .insert(users)
    .values([
      { email: "murdo@bar-excellence.app", name: "Murdo", role: "owner" },
      { email: "rob@roberthayford.com", name: "Rob", role: "super_admin" },
      { email: "rory@lc-group.com", name: "Rory", role: "partner" },
    ])
    .onConflictDoNothing();

  // ── Cocktails ──────────────────────────────────────
  console.log("Seeding cocktails...");

  const cocktailData = [
    {
      name: "Espresso Martini",
      defaultMenuName: "Espresso Martini",
      defaultMenuDescription:
        "A rich and velvety union of smooth vodka, coffee liqueur and freshly pulled espresso",
      season: "all_year" as const,
      glassType: "coupe" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      category: "Classic",
      ingredients: [
        { ingredientName: "Vodka", ingredientCategory: "spirit" as const, amount: "50", unit: "ml" as const, brand: "Absolut", sortOrder: 0 },
        { ingredientName: "Coffee Liqueur", ingredientCategory: "spirit" as const, amount: "25", unit: "ml" as const, brand: "Kahlua", sortOrder: 1 },
        { ingredientName: "Fresh Espresso", ingredientCategory: "other" as const, amount: "30", unit: "ml" as const, brand: null, sortOrder: 2 },
        { ingredientName: "Sugar Syrup", ingredientCategory: "syrup" as const, amount: "10", unit: "ml" as const, brand: null, sortOrder: 3 },
      ],
      garnishes: [
        { garnishName: "Coffee Beans", garnishCategory: "decorative" as const, quantity: "3", quantityUnit: "piece", sortOrder: 0 },
      ],
    },
    {
      name: "Negroni",
      defaultMenuName: "Negroni",
      defaultMenuDescription:
        "A bold and bittersweet symphony of gin, vermouth rosso and Campari",
      season: "all_year" as const,
      glassType: "rocks" as const,
      iceAmountG: 150,
      iceType: "Large cube",
      category: "Classic",
      ingredients: [
        { ingredientName: "Gin", ingredientCategory: "spirit" as const, amount: "30", unit: "ml" as const, brand: "Tanqueray", sortOrder: 0 },
        { ingredientName: "Campari", ingredientCategory: "modifier" as const, amount: "30", unit: "ml" as const, brand: "Campari", sortOrder: 1 },
        { ingredientName: "Sweet Vermouth", ingredientCategory: "modifier" as const, amount: "30", unit: "ml" as const, brand: "Cocchi di Torino", sortOrder: 2 },
      ],
      garnishes: [
        { garnishName: "Orange Peel", garnishCategory: "fruit" as const, quantity: "1", quantityUnit: "piece", sortOrder: 0 },
      ],
    },
    {
      name: "Mojito",
      defaultMenuName: "Mojito",
      defaultMenuDescription:
        "Crisp white rum muddled with fresh mint and lime, lifted with sparkling soda",
      season: "summer" as const,
      glassType: "highball" as const,
      iceAmountG: 200,
      iceType: "Crushed",
      category: "Classic",
      ingredients: [
        { ingredientName: "White Rum", ingredientCategory: "spirit" as const, amount: "50", unit: "ml" as const, brand: "Havana Club 3", sortOrder: 0 },
        { ingredientName: "Fresh Lime Juice", ingredientCategory: "citrus" as const, amount: "25", unit: "ml" as const, brand: null, sortOrder: 1 },
        { ingredientName: "Sugar Syrup", ingredientCategory: "syrup" as const, amount: "20", unit: "ml" as const, brand: null, sortOrder: 2 },
        { ingredientName: "Soda Water", ingredientCategory: "soda" as const, amount: "60", unit: "ml" as const, brand: null, sortOrder: 3 },
      ],
      garnishes: [
        { garnishName: "Fresh Mint Sprig", garnishCategory: "botanical" as const, quantity: "1", quantityUnit: "sprig", sortOrder: 0 },
        { garnishName: "Lime Wheel", garnishCategory: "fruit" as const, quantity: "1", quantityUnit: "piece", sortOrder: 1 },
      ],
    },
    {
      name: "Old Fashioned",
      defaultMenuName: "Old Fashioned",
      defaultMenuDescription:
        "Bourbon softened with a touch of sugar and aromatic bitters over a large ice cube",
      season: "autumn" as const,
      glassType: "rocks" as const,
      iceAmountG: 180,
      iceType: "Large cube",
      category: "Classic",
      ingredients: [
        { ingredientName: "Bourbon", ingredientCategory: "spirit" as const, amount: "60", unit: "ml" as const, brand: "Woodford Reserve", sortOrder: 0 },
        { ingredientName: "Sugar Syrup", ingredientCategory: "syrup" as const, amount: "10", unit: "ml" as const, brand: null, sortOrder: 1 },
        { ingredientName: "Angostura Bitters", ingredientCategory: "modifier" as const, amount: "3", unit: "dash" as const, brand: "Angostura", sortOrder: 2 },
      ],
      garnishes: [
        { garnishName: "Orange Peel", garnishCategory: "fruit" as const, quantity: "1", quantityUnit: "piece", sortOrder: 0 },
      ],
    },
    {
      name: "Margarita",
      defaultMenuName: "Margarita",
      defaultMenuDescription:
        "The perfect balance of tequila, citrus and agave, served with a salted rim",
      season: "summer" as const,
      glassType: "coupe" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      category: "Classic",
      ingredients: [
        { ingredientName: "Tequila", ingredientCategory: "spirit" as const, amount: "50", unit: "ml" as const, brand: "Patron Silver", sortOrder: 0 },
        { ingredientName: "Triple Sec", ingredientCategory: "modifier" as const, amount: "25", unit: "ml" as const, brand: "Cointreau", sortOrder: 1 },
        { ingredientName: "Fresh Lime Juice", ingredientCategory: "citrus" as const, amount: "25", unit: "ml" as const, brand: null, sortOrder: 2 },
        { ingredientName: "Agave Syrup", ingredientCategory: "syrup" as const, amount: "10", unit: "ml" as const, brand: null, sortOrder: 3 },
      ],
      garnishes: [
        { garnishName: "Lime Wheel", garnishCategory: "fruit" as const, quantity: "1", quantityUnit: "piece", sortOrder: 0 },
        { garnishName: "Salt Rim", garnishCategory: "decorative" as const, quantity: "1", quantityUnit: "piece", sortOrder: 1 },
      ],
    },
    {
      name: "Whiskey Sour",
      defaultMenuName: "Whiskey Sour",
      defaultMenuDescription:
        "Bourbon shaken with fresh lemon, sweetened with syrup and crowned with a silken foam",
      season: "autumn" as const,
      glassType: "rocks" as const,
      iceAmountG: 150,
      iceType: "Cubed",
      category: "Classic",
      ingredients: [
        { ingredientName: "Bourbon", ingredientCategory: "spirit" as const, amount: "50", unit: "ml" as const, brand: "Woodford Reserve", sortOrder: 0 },
        { ingredientName: "Fresh Lemon Juice", ingredientCategory: "citrus" as const, amount: "25", unit: "ml" as const, brand: null, sortOrder: 1 },
        { ingredientName: "Sugar Syrup", ingredientCategory: "syrup" as const, amount: "20", unit: "ml" as const, brand: null, sortOrder: 2 },
        { ingredientName: "Egg White", ingredientCategory: "foamer" as const, amount: "20", unit: "ml" as const, brand: null, sortOrder: 3 },
        { ingredientName: "Angostura Bitters", ingredientCategory: "modifier" as const, amount: "2", unit: "dash" as const, brand: "Angostura", sortOrder: 4 },
      ],
      garnishes: [
        { garnishName: "Lemon Wheel", garnishCategory: "fruit" as const, quantity: "1", quantityUnit: "piece", sortOrder: 0 },
      ],
    },
    {
      name: "Cosmopolitan",
      defaultMenuName: "Cosmopolitan",
      defaultMenuDescription:
        "Citrus vodka meets cranberry and a whisper of Cointreau in this elegant icon",
      season: "all_year" as const,
      glassType: "martini" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      category: "Classic",
      ingredients: [
        { ingredientName: "Citrus Vodka", ingredientCategory: "spirit" as const, amount: "40", unit: "ml" as const, brand: "Absolut Citron", sortOrder: 0 },
        { ingredientName: "Triple Sec", ingredientCategory: "modifier" as const, amount: "20", unit: "ml" as const, brand: "Cointreau", sortOrder: 1 },
        { ingredientName: "Cranberry Juice", ingredientCategory: "juice" as const, amount: "30", unit: "ml" as const, brand: null, sortOrder: 2 },
        { ingredientName: "Fresh Lime Juice", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 3 },
      ],
      garnishes: [
        { garnishName: "Flamed Orange Peel", garnishCategory: "fruit" as const, quantity: "1", quantityUnit: "piece", sortOrder: 0 },
      ],
    },
    {
      name: "Daiquiri",
      defaultMenuName: "Daiquiri",
      defaultMenuDescription:
        "White rum, fresh lime and a touch of sugar, shaken to icy perfection",
      season: "summer" as const,
      glassType: "coupe" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      category: "Classic",
      ingredients: [
        { ingredientName: "White Rum", ingredientCategory: "spirit" as const, amount: "60", unit: "ml" as const, brand: "Havana Club 3", sortOrder: 0 },
        { ingredientName: "Fresh Lime Juice", ingredientCategory: "citrus" as const, amount: "25", unit: "ml" as const, brand: null, sortOrder: 1 },
        { ingredientName: "Sugar Syrup", ingredientCategory: "syrup" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 2 },
      ],
      garnishes: [
        { garnishName: "Lime Wheel", garnishCategory: "fruit" as const, quantity: "1", quantityUnit: "piece", sortOrder: 0 },
      ],
    },
    {
      name: "Aperol Spritz",
      defaultMenuName: "Aperol Spritz",
      defaultMenuDescription:
        "Bittersweet Aperol lifted with prosecco and a splash of soda, pure Italian sunshine",
      season: "spring" as const,
      glassType: "highball" as const,
      iceAmountG: 150,
      iceType: "Cubed",
      category: "Spritz",
      ingredients: [
        { ingredientName: "Aperol", ingredientCategory: "modifier" as const, amount: "60", unit: "ml" as const, brand: "Aperol", sortOrder: 0 },
        { ingredientName: "Prosecco", ingredientCategory: "modifier" as const, amount: "90", unit: "ml" as const, brand: null, sortOrder: 1 },
        { ingredientName: "Soda Water", ingredientCategory: "soda" as const, amount: "30", unit: "ml" as const, brand: null, sortOrder: 2 },
      ],
      garnishes: [
        { garnishName: "Orange Slice", garnishCategory: "fruit" as const, quantity: "1", quantityUnit: "piece", sortOrder: 0 },
      ],
    },
    {
      name: "Placebo NA",
      defaultMenuName: "The Placebo",
      defaultMenuDescription:
        "A vibrant non-alcoholic blend of passionfruit, vanilla and citrus with a creamy finish",
      season: "all_year" as const,
      glassType: "coupe" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      category: "Non-Alcoholic",
      isNonAlcoholic: true,
      ingredients: [
        { ingredientName: "Passionfruit Puree", ingredientCategory: "puree" as const, amount: "40", unit: "ml" as const, brand: null, sortOrder: 0 },
        { ingredientName: "Vanilla Syrup", ingredientCategory: "syrup" as const, amount: "20", unit: "ml" as const, brand: null, sortOrder: 1 },
        { ingredientName: "Fresh Lime Juice", ingredientCategory: "citrus" as const, amount: "20", unit: "ml" as const, brand: null, sortOrder: 2 },
        { ingredientName: "Aquafaba", ingredientCategory: "foamer" as const, amount: "20", unit: "ml" as const, brand: null, sortOrder: 3 },
      ],
      garnishes: [
        { garnishName: "Passionfruit Half", garnishCategory: "fruit" as const, quantity: "1", quantityUnit: "piece", sortOrder: 0 },
      ],
    },
  ];

  for (const c of cocktailData) {
    const { ingredients, garnishes, ...cocktailRow } = c;

    const [inserted] = await db
      .insert(cocktails)
      .values(cocktailRow)
      .returning({ id: cocktails.id });

    if (ingredients.length > 0) {
      await db.insert(cocktailIngredients).values(
        ingredients.map((ing) => ({
          ...ing,
          cocktailId: inserted.id,
        }))
      );
    }

    if (garnishes.length > 0) {
      await db.insert(cocktailGarnishes).values(
        garnishes.map((g) => ({
          ...g,
          cocktailId: inserted.id,
        }))
      );
    }

    console.log(`  ✓ ${c.name}`);
  }

  console.log("\nSeed complete!");
}

seed().catch(console.error);
