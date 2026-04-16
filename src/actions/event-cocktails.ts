"use server";

import { db } from "@/db";
import {
  eventCocktails,
  cocktails,
  cocktailIngredients,
  cocktailGarnishes,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function addCocktailToEvent(
  eventId: string,
  cocktailId: string
): Promise<{ error?: string }> {
  await requireRole("owner", "super_admin");

  // Get cocktail details for defaults
  const [cocktail] = await db
    .select()
    .from(cocktails)
    .where(eq(cocktails.id, cocktailId))
    .limit(1);

  if (!cocktail) return { error: "Cocktail not found" };

  await db.insert(eventCocktails).values({
    eventId,
    cocktailId,
    menuName: cocktail.defaultMenuName,
    menuDescription: cocktail.defaultMenuDescription,
  });

  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function removeCocktailFromEvent(
  eventId: string,
  eventCocktailId: string
) {
  await requireRole("owner", "super_admin");

  await db
    .delete(eventCocktails)
    .where(eq(eventCocktails.id, eventCocktailId));

  revalidatePath(`/events/${eventId}`);
}

export async function updateEventCocktail(
  eventCocktailId: string,
  eventId: string,
  data: {
    menuName?: string;
    menuDescription?: string;
    stationNumber?: number | null;
    servesAllocated?: number | null;
  }
) {
  await requireRole("owner", "super_admin");

  await db
    .update(eventCocktails)
    .set(data)
    .where(eq(eventCocktails.id, eventCocktailId));

  revalidatePath(`/events/${eventId}`);
}

export async function getEventCocktails(eventId: string) {
  await requireRole("owner", "super_admin", "partner");

  // Single JOIN query for stock calculator (Eng Review Issue 8A)
  const selected = await db
    .select()
    .from(eventCocktails)
    .where(eq(eventCocktails.eventId, eventId))
    .orderBy(eventCocktails.sortOrder);

  // For each selected cocktail, get the full recipe with ingredients
  const enriched = await Promise.all(
    selected.map(async (ec) => {
      const [cocktail] = await db
        .select()
        .from(cocktails)
        .where(eq(cocktails.id, ec.cocktailId))
        .limit(1);

      const ingredients = await db
        .select()
        .from(cocktailIngredients)
        .where(eq(cocktailIngredients.cocktailId, ec.cocktailId))
        .orderBy(cocktailIngredients.sortOrder);

      const garnishes = await db
        .select()
        .from(cocktailGarnishes)
        .where(eq(cocktailGarnishes.cocktailId, ec.cocktailId))
        .orderBy(cocktailGarnishes.sortOrder);

      return {
        ...ec,
        cocktail,
        ingredients,
        garnishes,
      };
    })
  );

  return enriched;
}

export async function getAvailableCocktails() {
  await requireRole("owner", "super_admin");

  return db
    .select()
    .from(cocktails)
    .where(eq(cocktails.isActive, true))
    .orderBy(cocktails.name);
}
