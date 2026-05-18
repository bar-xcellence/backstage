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
      name: "Spiced Passionstar",
      defaultMenuName: "Spiced Passionstar",
      defaultMenuDescription:
        "Spiced rum, passionfruit, freshly squeezed lemon, pineapple & glistening with edible glitter",
      season: "all_year" as const,
      glassType: "rocks" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      straw: true,
      strawType: "Black short cardboard",
      category: "Signature",
      isNonAlcoholic: false,
      ingredients: [
        { ingredientName: "Spiced Rum", ingredientCategory: "spirit" as const, amount: "25", unit: "ml" as const, brand: null, sortOrder: 0 },
        { ingredientName: "Passionfruit Puree", ingredientCategory: "puree" as const, amount: "25", unit: "ml" as const, brand: "Boiron", sortOrder: 1 },
        { ingredientName: "Gomme", ingredientCategory: "syrup" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 2 },
        { ingredientName: "Lemon", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: "Boiron", sortOrder: 3 },
        { ingredientName: "Pineapple Juice", ingredientCategory: "juice" as const, amount: "75", unit: "ml" as const, brand: null, sortOrder: 4 },
      ],
      garnishes: [
        { garnishName: "Passionfruit Quarter (float)", garnishCategory: "fruit" as const, quantity: "0.25", quantityUnit: "whole", sortOrder: 0 },
        { garnishName: "Pineapple Leaf", garnishCategory: "botanical" as const, quantity: "1", quantityUnit: "piece", sortOrder: 1 },
        { garnishName: "Edible Gold Duster Spray", garnishCategory: "spray" as const, quantity: "1", quantityUnit: "spray", sortOrder: 2 },
      ],
    },
    {
      name: "Springtime Clover Club",
      defaultMenuName: "Springtime Clover Club",
      defaultMenuDescription:
        "Gin, raspberries, mint, freshly squeezed lemon, elderflower & cloudy apple",
      season: "spring" as const,
      glassType: "coupe" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      straw: false,
      category: "Signature",
      isNonAlcoholic: false,
      notes: "Source PDF menu description mentions 'cloudy apple' but the spec lists no apple juice — seeded without apple. Flag in gap report.",
      ingredients: [
        { ingredientName: "Gin", ingredientCategory: "spirit" as const, amount: "25", unit: "ml" as const, brand: null, sortOrder: 0 },
        { ingredientName: "Raspberry Puree", ingredientCategory: "puree" as const, amount: "25", unit: "ml" as const, brand: "Boiron", sortOrder: 1 },
        { ingredientName: "Lemon", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: "Boiron", sortOrder: 2 },
        { ingredientName: "Gomme", ingredientCategory: "syrup" as const, amount: "10", unit: "ml" as const, brand: null, sortOrder: 3 },
        { ingredientName: "Elderflower Cordial", ingredientCategory: "modifier" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 4 },
        { ingredientName: "Miraculous Foamer", ingredientCategory: "foamer" as const, amount: "3", unit: "drops" as const, brand: null, sortOrder: 5 },
      ],
      garnishes: [
        { garnishName: "Fresh Raspberry", garnishCategory: "fruit" as const, quantity: "2", quantityUnit: "piece", sortOrder: 0 },
        { garnishName: "Mint Sprig", garnishCategory: "botanical" as const, quantity: "1", quantityUnit: "sprig", sortOrder: 1 },
        { garnishName: "Bamboo Spear", garnishCategory: "decorative" as const, quantity: "1", quantityUnit: "piece", sortOrder: 2 },
      ],
    },
    {
      name: "Clydeport Celebration",
      defaultMenuName: "Clydeport Celebration",
      defaultMenuDescription:
        "Drambuie, freshly squeezed lemon, cloudy apple & citrus foam, garnished with heather",
      season: "all_year" as const,
      glassType: "rocks" as const,
      iceAmountG: 200,
      iceType: "Crushed",
      straw: true,
      strawType: "Black short cardboard",
      category: "Signature",
      isNonAlcoholic: false,
      notes: "Source spec flagged Gomme as '10ml (check)' — confirm amount with Murdo.",
      ingredients: [
        { ingredientName: "Drambuie", ingredientCategory: "spirit" as const, amount: "50", unit: "ml" as const, brand: "Drambuie", sortOrder: 0 },
        { ingredientName: "Lemon", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: "Boiron", sortOrder: 1 },
        { ingredientName: "Apple Juice", ingredientCategory: "juice" as const, amount: "50", unit: "ml" as const, brand: null, sortOrder: 2 },
        { ingredientName: "Gomme", ingredientCategory: "syrup" as const, amount: "10", unit: "ml" as const, brand: null, sortOrder: 3 },
        { ingredientName: "Miraculous Foamer", ingredientCategory: "foamer" as const, amount: "3", unit: "drops" as const, brand: null, sortOrder: 4 },
      ],
      garnishes: [
        { garnishName: "Heather Sprig", garnishCategory: "botanical" as const, quantity: "1", quantityUnit: "sprig", sortOrder: 0 },
      ],
    },
    {
      name: "Barrowlands Stars",
      defaultMenuName: "Barrowlands Stars",
      defaultMenuDescription:
        "Spiced rum, passionfruit, freshly squeezed lemon & pineapple, with edible gold dust",
      season: "all_year" as const,
      glassType: "rocks" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      straw: true,
      strawType: "Black short cardboard",
      category: "Signature",
      isNonAlcoholic: false,
      notes: "Sister recipe of Spiced Passionstar (35ml rum vs 25ml).",
      ingredients: [
        { ingredientName: "Spiced Rum", ingredientCategory: "spirit" as const, amount: "35", unit: "ml" as const, brand: null, sortOrder: 0 },
        { ingredientName: "Passionfruit Puree", ingredientCategory: "puree" as const, amount: "25", unit: "ml" as const, brand: "Boiron", sortOrder: 1 },
        { ingredientName: "Gomme", ingredientCategory: "syrup" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 2 },
        { ingredientName: "Lemon", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: "Boiron", sortOrder: 3 },
        { ingredientName: "Pineapple Juice", ingredientCategory: "juice" as const, amount: "75", unit: "ml" as const, brand: null, sortOrder: 4 },
      ],
      garnishes: [
        { garnishName: "Passionfruit Quarter (float)", garnishCategory: "fruit" as const, quantity: "0.25", quantityUnit: "whole", sortOrder: 0 },
        { garnishName: "Pineapple Leaf", garnishCategory: "botanical" as const, quantity: "1", quantityUnit: "piece", sortOrder: 1 },
        { garnishName: "Edible Gold Duster Spray", garnishCategory: "spray" as const, quantity: "1", quantityUnit: "spray", sortOrder: 2 },
      ],
    },
    {
      name: "Wellingtons Gin Club",
      defaultMenuName: "Wellingtons Gin Club",
      defaultMenuDescription:
        "Gin, raspberry, mint, freshly squeezed lemon & elderflower",
      season: "all_year" as const,
      glassType: "coupe" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      straw: false,
      category: "Signature",
      isNonAlcoholic: false,
      notes: "Sister recipe of Springtime Clover Club (35ml gin vs 25ml).",
      ingredients: [
        { ingredientName: "Gin", ingredientCategory: "spirit" as const, amount: "35", unit: "ml" as const, brand: null, sortOrder: 0 },
        { ingredientName: "Raspberry Puree", ingredientCategory: "puree" as const, amount: "25", unit: "ml" as const, brand: "Boiron", sortOrder: 1 },
        { ingredientName: "Lemon", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: "Boiron", sortOrder: 2 },
        { ingredientName: "Gomme", ingredientCategory: "syrup" as const, amount: "10", unit: "ml" as const, brand: null, sortOrder: 3 },
        { ingredientName: "Elderflower Cordial", ingredientCategory: "modifier" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 4 },
        { ingredientName: "Miraculous Foamer", ingredientCategory: "foamer" as const, amount: "3", unit: "drops" as const, brand: null, sortOrder: 5 },
      ],
      garnishes: [
        { garnishName: "Fresh Raspberry", garnishCategory: "fruit" as const, quantity: "2", quantityUnit: "piece", sortOrder: 0 },
        { garnishName: "Mint Sprig", garnishCategory: "botanical" as const, quantity: "1", quantityUnit: "sprig", sortOrder: 1 },
        { garnishName: "Bamboo Spear", garnishCategory: "decorative" as const, quantity: "1", quantityUnit: "piece", sortOrder: 2 },
      ],
    },
    {
      name: "Clockwork Orange Margarita",
      defaultMenuName: "Clockwork Orange Margarita",
      defaultMenuDescription:
        "Tequila, triple sec, mango, freshly squeezed lime, orange blossom, agave & hibiscus rim",
      season: "all_year" as const,
      glassType: "coupe" as const,
      iceAmountG: 200,
      iceType: "Cubed",
      straw: false,
      category: "Signature",
      isNonAlcoholic: false,
      notes: "Source menu description mentions 'orange blossom' but spec has no orange blossom water — seeded as listed in spec. Flag in gap report.",
      ingredients: [
        { ingredientName: "Tequila Blanco", ingredientCategory: "spirit" as const, amount: "25", unit: "ml" as const, brand: null, sortOrder: 0 },
        { ingredientName: "Triple Sec", ingredientCategory: "modifier" as const, amount: "25", unit: "ml" as const, brand: null, sortOrder: 1 },
        { ingredientName: "Mango Puree", ingredientCategory: "puree" as const, amount: "25", unit: "ml" as const, brand: "Boiron", sortOrder: 2 },
        { ingredientName: "Lime", ingredientCategory: "citrus" as const, amount: "15", unit: "ml" as const, brand: "Boiron", sortOrder: 3 },
        { ingredientName: "Agave Syrup", ingredientCategory: "syrup" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 4 },
        { ingredientName: "Orange Juice", ingredientCategory: "juice" as const, amount: "15", unit: "ml" as const, brand: null, sortOrder: 5 },
      ],
      garnishes: [
        { garnishName: "Hibiscus Powder Rim", garnishCategory: "decorative" as const, quantity: "1", quantityUnit: "rim", sortOrder: 0 },
        { garnishName: "Mango Spike", garnishCategory: "fruit" as const, quantity: "1", quantityUnit: "piece", sortOrder: 1 },
        { garnishName: "Purple Petal", garnishCategory: "decorative" as const, quantity: "1", quantityUnit: "petal", sortOrder: 2 },
        { garnishName: "Mini Peg", garnishCategory: "decorative" as const, quantity: "1", quantityUnit: "piece", sortOrder: 3 },
      ],
    },
  ];

  const cocktailIdByName = new Map<string, string>();
  for (const c of cocktailData) {
    const { ingredients, garnishes, ...cocktailRow } = c;

    const [inserted] = await db
      .insert(cocktails)
      .values(cocktailRow)
      .returning({ id: cocktails.id });

    cocktailIdByName.set(c.name, inserted.id);

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
