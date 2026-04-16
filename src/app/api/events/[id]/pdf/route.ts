import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import {
  events,
  eventCocktails,
  cocktails,
  cocktailIngredients,
  cocktailGarnishes,
  eventContacts,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateStock } from "@/lib/stock-calculator";
import { BriefPDF } from "@/lib/pdf/brief-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Fetch event
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Partner can only access confirmed+ events
    if (
      session.role === "partner" &&
      !["confirmed", "preparation", "ready", "delivered"].includes(
        event.status
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch contacts
    const contacts = await db
      .select()
      .from(eventContacts)
      .where(eq(eventContacts.eventId, id));

    // Fetch cocktails with ingredients
    const selectedCocktails = await db
      .select()
      .from(eventCocktails)
      .where(eq(eventCocktails.eventId, id))
      .orderBy(eventCocktails.sortOrder);

    const enrichedCocktails = await Promise.all(
      selectedCocktails.map(async (ec) => {
        const [cocktail] = await db
          .select()
          .from(cocktails)
          .where(eq(cocktails.id, ec.cocktailId))
          .limit(1);
        const ings = await db
          .select()
          .from(cocktailIngredients)
          .where(eq(cocktailIngredients.cocktailId, ec.cocktailId));
        const garns = await db
          .select()
          .from(cocktailGarnishes)
          .where(eq(cocktailGarnishes.cocktailId, ec.cocktailId));
        return { ...ec, cocktail, ingredients: ings, garnishes: garns };
      })
    );

    // Calculate stock
    const totalServes =
      (event.prepaidServes || 0) + (event.cardPaymentServes || 0);
    const cocktailCount = enrichedCocktails.length;
    const stockInput = enrichedCocktails.map((ec) => ({
      servesAllocated:
        ec.servesAllocated ||
        (cocktailCount > 0 ? Math.floor(totalServes / cocktailCount) : 0),
      ingredients: ec.ingredients.map((ing) => ({
        ingredientName: ing.ingredientName,
        amount: Number(ing.amount),
        unit: ing.unit as string,
        brand: ing.brand,
        ingredientCategory: (ing.ingredientCategory as string) || "other",
      })),
      garnishes: ec.garnishes.map((g) => ({
        garnishName: g.garnishName,
        quantity: Number(g.quantity),
        quantityUnit: g.quantityUnit || "piece",
      })),
    }));
    const stock = calculateStock(stockInput);

    // Strip financials for partner
    const safeEvent =
      session.role === "partner"
        ? {
            ...event,
            invoiceAmount: null,
            costAmount: null,
            stockReturnPolicy: null,
          }
        : event;

    // Generate PDF with memory-safe fallback
    const pdfBuffer = await renderToBuffer(
      BriefPDF({
        event: safeEvent,
        contacts,
        cocktails: enrichedCocktails,
        stock,
      })
    );

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="brief-${event.eventName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
