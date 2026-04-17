import { db } from "../src/db";
import { cocktails } from "../src/db/schema";
async function main() {
  const allCocktails = await db.select().from(cocktails);
  console.log(JSON.stringify(allCocktails, null, 2));
}
main().catch(console.error).then(() => process.exit(0));
