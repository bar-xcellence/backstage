import { db } from "../src/db";
import { cocktails } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const allCocktails = await db.select().from(cocktails);
  
  const updates = [
    { name: "Espresso Martini", url: "/images/cocktails/espresso_martini.png" },
    { name: "Negroni", url: "/images/cocktails/negroni.png" },
    { name: "Mojito", url: "/images/cocktails/mojito.png" },
    { name: "Old Fashioned", url: "/images/cocktails/old_fashioned.png" },
    { name: "Margarita", url: "/images/cocktails/margarita.png" },
    { name: "Whiskey Sour", url: "/images/cocktails/whiskey_sour.png" },
    { name: "Cosmopolitan", url: "/images/cocktails/cosmopolitan.png" },
    { name: "Daiquiri", url: "/images/cocktails/daiquiri.png" },
    { name: "Aperol Spritz", url: "/images/cocktails/aperol_spritz.png" },
    { name: "Placebo NA", url: "/images/cocktails/placebo_na.png" }
  ];

  for (const c of allCocktails) {
    const update = updates.find(u => u.name === c.name);
    if (update) {
      await db.update(cocktails).set({ referenceImageUrl: update.url }).where(eq(cocktails.id, c.id));
      console.log(`Updated ${c.name} with ${update.url}`);
    }
  }
}

main().catch(console.error).then(() => process.exit(0));
