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
  eventStock,
  standardNotes,
  equipmentTemplates,
  equipmentTemplateItems,
  lcRecipients,
  appSettings,
} from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function cleanup() {
  console.log("Cleaning existing seed data...");
  await db.delete(eventEquipment);
  await db.delete(eventCocktails);
  await db.delete(eventContacts);
  await db.delete(eventStandardNotes);
  await db.delete(eventStock);
  await db.delete(events);
  await db.delete(cocktailIngredients);
  await db.delete(cocktailGarnishes);
  await db.delete(cocktails);
  await db.delete(equipmentTemplateItems);
  await db.delete(equipmentTemplates);
  await db.delete(standardNotes);
  await db.delete(lcRecipients);
  await db.delete(appSettings);
}

async function seed() {
  await cleanup();
  console.log("Seeding database...");

  // ── Users ──────────────────────────────────────────
  console.log("Seeding users...");
  const insertedUsers = await db
    .insert(users)
    .values([
      { email: "murdo@bar-excellence.app", name: "Murdo", role: "owner" },
      { email: "rob@roberthayford.com", name: "Rob", role: "super_admin" },
      { email: "rory@lc-group.com", name: "Rory", role: "partner" },
      {
        email: "roberthayford@outlook.com",
        name: "Rob (Partner test)",
        role: "partner",
      },
    ])
    .onConflictDoNothing()
    .returning({ id: users.id, email: users.email });

  // On re-runs onConflictDoNothing returns []. Fetch existing rows instead.
  const allUsers = insertedUsers.length
    ? insertedUsers
    : await db.select({ id: users.id, email: users.email }).from(users);
  const userIdByEmail = new Map(allUsers.map((u) => [u.email, u.id]));
  const murdoId = userIdByEmail.get("murdo@bar-excellence.app")!;

  // ── LC Recipients ──────────────────────────────────
  console.log("Seeding LC recipients...");
  await db.insert(lcRecipients).values([
    {
      label: "Rory · LC",
      email: "rory@lc-group.com",
      isDefaultTo: true,
      isAutoCc: false,
      isActive: true,
      sortOrder: 0,
    },
  ]);
  console.log("  ✓ Rory · LC (default)");

  // ── App Settings ───────────────────────────────────
  if (process.env.FROM_EMAIL) {
    console.log("Seeding app settings (from_email)...");
    await db.insert(appSettings).values({
      key: "from_email",
      value: process.env.FROM_EMAIL,
      updatedBy: murdoId,
    });
    console.log(`  ✓ from_email = ${process.env.FROM_EMAIL}`);
  }

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

  // ── Events ─────────────────────────────────────────
  console.log("Seeding events...");

  // ── Event 1: Heathrow Masterclass ──
  const [heathrow] = await db
    .insert(events)
    .values({
      createdBy: murdoId,
      eventName: "Hexaware Cocktail Masterclass",
      eventDate: "2026-05-15",
      arriveTime: "16:00:00",
      setupDeadline: "18:45:00",
      serviceStart: "19:15:00",
      serviceEnd: "20:15:00",
      departTime: "20:30:00",
      venueName: "London Hilton Heathrow Airport",
      venueHallRoom: "Conference room",
      addressLine1: "Terminal 5, Poole Rd",
      addressLine2: "Colnbrook",
      city: "Heathrow",
      postcode: "SL3 0FF",
      guestCount: 130,
      eventType: "masterclass",
      serviceType: "cocktails_mocktails",
      prepaidServes: 260,
      stationCount: 13,
      stationLayoutNotes:
        "13 tables of 10 guests. Each table: 8 glass bottles + foamer + garnishes + ice bucket + scoop + pre-cut garnish plate.",
      staffCount: 4,
      staffNames: "Murdo MacLeod; LC supplies 4 cocktail bartenders",
      installInstructions:
        "Trolley required. Sealed boxes only — no bags or open boxes. Meet Murdo at hotel loading bay at 16:00. Setup complete by 18:45 for 19:15 guest arrival.",
      status: "delivered",
      notesCustom:
        "60-minute masterclass format, 2 cocktails per guest (one of each menu item).",
      lcRecipient: "rory@lc-group.com",
      elementsSummary:
        "2 cocktail bartenders, station with pop up bar, stock and glass for prepaid serves",
      lcPayout: "1400.00",
      commissionNote: null,
    })
    .returning({ id: events.id });

  await db.insert(eventContacts).values([
    {
      eventId: heathrow.id,
      contactName: "Murdo MacLeod",
      contactRole: "Host (Bar Excellence)",
      contactPhone: "07882084422",
      isPrimary: true,
      isHost: true,
      sortOrder: 0,
    },
    {
      eventId: heathrow.id,
      contactName: "Nafisa Ali",
      contactRole: "Venue",
      contactEmail: "nafisa.ali@hilton.com",
      sortOrder: 1,
    },
    {
      eventId: heathrow.id,
      contactName: "Prakharg Ghildyal",
      contactRole: "Client (Hexaware)",
      contactPhone: "+447776651243",
      contactEmail: "prakharg@hexaware.com",
      sortOrder: 2,
    },
  ]);

  await db.insert(eventCocktails).values([
    {
      eventId: heathrow.id,
      cocktailId: cocktailIdByName.get("Spiced Passionstar")!,
      menuName: "Spiced Passionstar",
      menuDescription:
        "Spiced rum, passionfruit, freshly squeezed lemon, pineapple & glistening with edible glitter",
      servesAllocated: 130,
      sortOrder: 0,
    },
    {
      eventId: heathrow.id,
      cocktailId: cocktailIdByName.get("Springtime Clover Club")!,
      menuName: "Springtime Clover Club",
      menuDescription:
        "Gin, raspberries, mint, freshly squeezed lemon, elderflower & cloudy apple",
      servesAllocated: 130,
      sortOrder: 1,
    },
  ]);

  // WORKAROUND[per-guest-equipment]: 140 rocks/coupes/shakers = 130 guests + 10 spare.
  // No per_guest scaling rule in the enum, so all entered as fixed quantities.
  // WORKAROUND[plastic-box-qty]: PDF doesn't specify count for plastic boxes — picked 6 as judgement call.
  await db.insert(eventEquipment).values([
    { eventId: heathrow.id, itemName: "Glass bottles (labelled, on tables)", quantity: 110, isFromTemplate: false, sortOrder: 0 },
    { eventId: heathrow.id, itemName: "Pens for labels", quantity: 4, isFromTemplate: false, sortOrder: 1 },
    { eventId: heathrow.id, itemName: "Sticky labels (pack)", quantity: 1, isFromTemplate: false, sortOrder: 2 },
    { eventId: heathrow.id, itemName: "Ice bucket", quantity: 13, isFromTemplate: true, sortOrder: 3 },
    { eventId: heathrow.id, itemName: "Ice scoop", quantity: 13, isFromTemplate: true, sortOrder: 4 },
    { eventId: heathrow.id, itemName: "Fruit plate", quantity: 13, isFromTemplate: true, sortOrder: 5 },
    { eventId: heathrow.id, itemName: "Fruit knife", quantity: 3, isFromTemplate: false, sortOrder: 6 },
    { eventId: heathrow.id, itemName: "Chopping board", quantity: 3, isFromTemplate: false, sortOrder: 7 },
    { eventId: heathrow.id, itemName: "Rocks glass", quantity: 140, isFromTemplate: false, sortOrder: 8 },
    { eventId: heathrow.id, itemName: "Coupe glass", quantity: 140, isFromTemplate: false, sortOrder: 9 },
    { eventId: heathrow.id, itemName: "Plastic shaker (3-piece)", quantity: 140, isFromTemplate: false, sortOrder: 10 },
    { eventId: heathrow.id, itemName: "Brush and dustpan", quantity: 1, isFromTemplate: true, sortOrder: 11 },
    { eventId: heathrow.id, itemName: "Trolley", quantity: 1, isFromTemplate: false, sortOrder: 12 },
    { eventId: heathrow.id, itemName: "Large plastic box with lid", quantity: 6, isFromTemplate: false, sortOrder: 13 },
  ]);

  // Per-event stock: per-station consumables (1 per table × 13 tables) + substitution spirits
  await db.insert(eventStock).values([
    { eventId: heathrow.id, itemName: "Miraculous Foamer", category: "foamer", quantity: "1", unit: "bottle", brand: null, scalingRule: "per_station", sortOrder: 0 },
    { eventId: heathrow.id, itemName: "Edible Gold Duster Spray", category: "other", quantity: "1", unit: "pack", brand: null, scalingRule: "per_station", sortOrder: 1 },
    { eventId: heathrow.id, itemName: "Non-alcoholic Gin", category: "spirit", quantity: "4", unit: "bottle", brand: null, scalingRule: "per_event", sortOrder: 2 },
    { eventId: heathrow.id, itemName: "Non-alcoholic Spiced Rum", category: "spirit", quantity: "4", unit: "bottle", brand: "Captain Morgan Non Alco Spiced", scalingRule: "per_event", sortOrder: 3 },
  ]);

  await db.insert(eventStandardNotes).values([
    { eventId: heathrow.id, noteId: noteIdByLabel.get("Attire")!, sortOrder: 0 },
    { eventId: heathrow.id, noteId: noteIdByLabel.get("Problem Escalation")!, sortOrder: 1 },
    { eventId: heathrow.id, noteId: noteIdByLabel.get("Stock Movement")!, sortOrder: 2 },
    { eventId: heathrow.id, noteId: noteIdByLabel.get("On-Site Washing")!, sortOrder: 3 },
  ]);

  console.log("  ✓ Heathrow Masterclass (2026-05-15)");

  // ── Event 2: Glasgow Pinsent Masons ──
  const [glasgow] = await db
    .insert(events)
    .values({
      createdBy: murdoId,
      eventName: "Pinsent Masons Office Social",
      eventDate: "2026-04-23",
      arriveTime: "15:00:00",
      setupDeadline: "17:00:00",
      serviceStart: "18:00:00",
      serviceEnd: "21:00:00",
      departTime: "21:30:00",
      venueName: "Aurora",
      venueHallRoom: null,
      venueTenant: "Pinsent Masons",
      cateringPartner: "Lexington Catering",
      addressLine1: "120 Bothwell Street",
      city: "Glasgow",
      postcode: "G2 7JS",
      guestCount: 100,
      eventType: "drinks_reception",
      serviceType: "cocktails_mocktails",
      prepaidServes: 200,
      stationCount: 3,
      stationLayoutNotes:
        "3 bartender stations on a 3m curved pop-up bar. 40 cocktails pre-poured on bar top at 17:45 (10 of each of 4 types). All stock and glassware hidden behind bar throughout.",
      staffCount: 3,
      staffNames: "Murdo MacLeod; James McClymont; 3 LC bartenders",
      popUpBar: true,
      popUpBarSize: "3m curved",
      popUpBarBranding: "Vinyl banner front branding, attached seamlessly to the bar",
      installInstructions:
        "Meet Murdo outside the building at 15:00. Bar in place first, vinyl attached seamlessly. All stock/glassware hidden behind bar out of sight. Loading bay access TBC (updated Tuesday before event).",
      batchingInstructions:
        "Pre-pour 40 cocktails on bar top at 17:45 (10 of each of 4 types). Bar top must be clean and beautiful throughout service.",
      status: "delivered",
      notesCustom: [
        "Glasses to be collected from floor and returned to bar throughout service.",
        "",
        "Venue also serves wine + champagne from a separate bar (not our responsibility).",
      ].join("\n"),
      lcRecipient: "rory@lc-group.com",
      elementsSummary:
        "2 cocktail bartenders, pre-poured drinks reception, pop up bar, stock for service",
      lcPayout: "1200.00",
      commissionNote:
        "Small commission on cocktails sold at £9.95 each after the prepaid 200 serves",
    })
    .returning({ id: events.id });

  await db.insert(eventContacts).values([
    {
      eventId: glasgow.id,
      contactName: "Murdo MacLeod",
      contactRole: "Host (Bar Excellence)",
      contactPhone: "07882084422",
      isPrimary: true,
      isHost: true,
      sortOrder: 0,
    },
    {
      eventId: glasgow.id,
      contactName: "James McClymont",
      contactPhone: "07916857416",
      sortOrder: 1,
    },
  ]);

  await db.insert(eventCocktails).values([
    {
      eventId: glasgow.id,
      cocktailId: cocktailIdByName.get("Clydeport Celebration")!,
      menuName: "Clydeport Celebration",
      menuDescription:
        "Drambuie, freshly squeezed lemon, cloudy apple & citrus foam, garnished with heather",
      servesAllocated: 50,
      sortOrder: 0,
    },
    {
      eventId: glasgow.id,
      cocktailId: cocktailIdByName.get("Wellingtons Gin Club")!,
      menuName: "Wellingtons Gin Club",
      menuDescription: "Gin, raspberry, mint, freshly squeezed lemon & elderflower",
      servesAllocated: 50,
      sortOrder: 1,
    },
    {
      eventId: glasgow.id,
      cocktailId: cocktailIdByName.get("Barrowlands Stars")!,
      menuName: "Barrowlands Stars",
      menuDescription:
        "Spiced rum, passionfruit, freshly squeezed lemon & pineapple, with edible gold dust",
      servesAllocated: 50,
      sortOrder: 2,
    },
    {
      eventId: glasgow.id,
      cocktailId: cocktailIdByName.get("Clockwork Orange Margarita")!,
      menuName: "Clockwork Orange Margarita",
      menuDescription:
        "Tequila, triple sec, mango, freshly squeezed lime, orange blossom, agave & hibiscus rim",
      servesAllocated: 50,
      sortOrder: 3,
    },
  ]);

  // WORKAROUND[per-guest-equipment]: 100 rocks/coupes = exact guest count.
  await db.insert(eventEquipment).values([
    { eventId: glasgow.id, itemName: "Etched rocks glass", quantity: 100, isFromTemplate: false, sortOrder: 0 },
    { eventId: glasgow.id, itemName: "Coupe glass", quantity: 100, isFromTemplate: false, sortOrder: 1 },
    { eventId: glasgow.id, itemName: "Bin (back of bar)", quantity: 2, isFromTemplate: true, sortOrder: 2 },
    { eventId: glasgow.id, itemName: "Bin liners (pack)", quantity: 1, isFromTemplate: true, sortOrder: 3 },
    { eventId: glasgow.id, itemName: "Ice bucket", quantity: 3, isFromTemplate: true, sortOrder: 4 },
    { eventId: glasgow.id, itemName: "Ice scoop", quantity: 3, isFromTemplate: true, sortOrder: 5 },
    { eventId: glasgow.id, itemName: "Large box (cubed ice)", quantity: 1, isFromTemplate: false, sortOrder: 6 },
    { eventId: glasgow.id, itemName: "Large box (crushed ice)", quantity: 1, isFromTemplate: false, sortOrder: 7 },
    { eventId: glasgow.id, itemName: "Bartender kit (full set: speedpours, knives, boards, shakers, hawthorns, fine strainers, squeeze bottles, bar spoons)", quantity: 3, isFromTemplate: false, sortOrder: 8 },
    { eventId: glasgow.id, itemName: "First aid kit", quantity: 1, isFromTemplate: true, sortOrder: 9 },
    { eventId: glasgow.id, itemName: "Brush and dustpan", quantity: 1, isFromTemplate: true, sortOrder: 10 },
    { eventId: glasgow.id, itemName: "Menu in holder", quantity: 1, isFromTemplate: true, sortOrder: 11 },
  ]);

  // Per-event stock: per-event consumables (single bar service, smaller scale) + substitution spirits
  await db.insert(eventStock).values([
    { eventId: glasgow.id, itemName: "Miraculous Foamer", category: "foamer", quantity: "2", unit: "bottle", brand: null, scalingRule: "per_event", sortOrder: 0 },
    { eventId: glasgow.id, itemName: "Hibiscus Powder", category: "other", quantity: "1", unit: "tub", brand: null, scalingRule: "per_event", sortOrder: 1 },
    { eventId: glasgow.id, itemName: "Edible Gold Duster Spray", category: "other", quantity: "2", unit: "pump", brand: null, scalingRule: "per_event", sortOrder: 2 },
    { eventId: glasgow.id, itemName: "Non-alcoholic Scotch Whisky", category: "spirit", quantity: "1", unit: "bottle", brand: null, scalingRule: "per_event", sortOrder: 3 },
    { eventId: glasgow.id, itemName: "Non-alcoholic Gin", category: "spirit", quantity: "1", unit: "bottle", brand: null, scalingRule: "per_event", sortOrder: 4 },
    { eventId: glasgow.id, itemName: "Non-alcoholic Spiced Rum", category: "spirit", quantity: "1", unit: "bottle", brand: null, scalingRule: "per_event", sortOrder: 5 },
    { eventId: glasgow.id, itemName: "Non-alcoholic Agave Spirit", category: "spirit", quantity: "1", unit: "bottle", brand: null, scalingRule: "per_event", sortOrder: 6 },
  ]);

  await db.insert(eventStandardNotes).values([
    { eventId: glasgow.id, noteId: noteIdByLabel.get("Attire")!, sortOrder: 0 },
    { eventId: glasgow.id, noteId: noteIdByLabel.get("Problem Escalation")!, sortOrder: 1 },
    { eventId: glasgow.id, noteId: noteIdByLabel.get("Stock Movement")!, sortOrder: 2 },
    { eventId: glasgow.id, noteId: noteIdByLabel.get("On-Site Washing")!, sortOrder: 3 },
  ]);

  console.log("  ✓ Pinsent Masons Office Social (2026-04-23)");

  console.log("\nSeed complete!");
}

seed().catch(console.error);
