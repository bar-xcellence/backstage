import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  users,
  cocktails,
  cocktailIngredients,
  cocktailGarnishes,
  events,
  eventContacts,
  eventCocktails,
  eventEquipment,
  eventStandardNotes,
  standardNotes,
  equipmentTemplates,
  equipmentTemplateItems,
} from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function cleanup() {
  console.log("Cleaning existing seed data...");
  await db.delete(eventEquipment);
  await db.delete(eventCocktails);
  await db.delete(eventContacts);
  await db.delete(eventStandardNotes);
  await db.delete(events);
  await db.delete(cocktailIngredients);
  await db.delete(cocktailGarnishes);
  await db.delete(cocktails);
  await db.delete(equipmentTemplateItems);
  await db.delete(equipmentTemplates);
  await db.delete(standardNotes);
}

async function seed() {
  await cleanup();
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

  // ── Standard Notes ─────────────────────────────────
  console.log("Seeding standard notes...");

  const standardNotesData = [
    {
      label: "Attire",
      content:
        "All extended team must arrive to site already in set attire:\n- Black bow ties\n- Black waistcoats\n- White ironed shirts\n- Smart black trousers (not jeans)\n- Polished black shoes (not trainers)",
      sortOrder: 0,
    },
    {
      label: "Problem Escalation",
      content:
        "Any problems to solve, Murdo will be there for first few hours. After that, call him with anything to solve. Do not ask the venue teams.",
      sortOrder: 1,
    },
    {
      label: "Stock Movement",
      content:
        "All alcohol and ingredients must be moved in sealed boxes from the vehicle through the building to the event space. No bags or open boxes. Bring a trolley to move the items.",
      sortOrder: 2,
    },
    {
      label: "On-Site Washing",
      content: "We are not washing any glasses on site.",
      sortOrder: 3,
    },
  ];

  const insertedNotes = await db
    .insert(standardNotes)
    .values(standardNotesData)
    .returning({ id: standardNotes.id, label: standardNotes.label });

  const noteIdByLabel = new Map(insertedNotes.map((n) => [n.label, n.id]));
  console.log(`  ✓ ${insertedNotes.length} standard notes`);

  // ── Equipment Templates ────────────────────────────
  console.log("Seeding equipment templates...");

  const equipmentTemplatesData = [
    {
      name: "Bartender Kit",
      description: "Per-station bartender toolkit; scales with stationCount.",
      items: [
        { itemName: "Speedpour", baseQuantity: 6, scalingRule: "per_station" as const, sortOrder: 0 },
        { itemName: "Fruit knife", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 1 },
        { itemName: "Chopping board", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 2 },
        { itemName: "Cocktail shaker (3-piece)", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 3 },
        { itemName: "Hawthorn strainer", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 4 },
        { itemName: "Fine strainer", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 5 },
        { itemName: "Squeeze bottle", baseQuantity: 4, scalingRule: "per_station" as const, sortOrder: 6 },
        { itemName: "Bar spoon", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 7 },
      ],
    },
    {
      name: "Service Setup",
      description: "Core event setup — bins, first aid, menu, ice service.",
      items: [
        { itemName: "Bin", baseQuantity: 2, scalingRule: "fixed" as const, sortOrder: 0 },
        { itemName: "Bin liners (pack)", baseQuantity: 1, scalingRule: "fixed" as const, sortOrder: 1 },
        { itemName: "Brush and dustpan", baseQuantity: 1, scalingRule: "fixed" as const, sortOrder: 2 },
        { itemName: "First aid kit", baseQuantity: 1, scalingRule: "fixed" as const, sortOrder: 3 },
        { itemName: "Menu in holder", baseQuantity: 1, scalingRule: "fixed" as const, sortOrder: 4 },
        { itemName: "Ice bucket", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 5 },
        { itemName: "Ice scoop", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 6 },
        { itemName: "Fruit plate", baseQuantity: 1, scalingRule: "per_station" as const, sortOrder: 7 },
      ],
    },
  ];

  for (const tmpl of equipmentTemplatesData) {
    const { items, ...templateRow } = tmpl;
    const [inserted] = await db
      .insert(equipmentTemplates)
      .values(templateRow)
      .returning({ id: equipmentTemplates.id });
    await db.insert(equipmentTemplateItems).values(
      items.map((it) => ({ ...it, templateId: inserted.id }))
    );
    console.log(`  ✓ ${tmpl.name} (${items.length} items)`);
  }

  console.log("\nSeed complete!");
}

seed().catch(console.error);
