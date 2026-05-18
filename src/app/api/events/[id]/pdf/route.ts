import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { registerBriefPdfFonts } from "@/lib/pdf/register-brief-pdf-fonts";
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
import { fetchEventStock } from "@/lib/event-stock-query";
import { stripPartnerFinancials } from "@/lib/partner-event-sanitisation";
import { BriefPDF } from "@/lib/pdf/brief-pdf";
import { TextOnlyBriefPDF } from "@/lib/pdf/text-only-brief-pdf";
import { renderBriefWithFallback } from "@/lib/pdf/render-brief-with-fallback";
import { fetchEventStandardNotes } from "@/lib/event-standard-notes-query";

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
    registerBriefPdfFonts();

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

    const standardNotes = await fetchEventStandardNotes(id);

    // Calculate stock
    const totalServes =
      (event.prepaidServes || 0) + (event.cardPaymentServes || 0);
    const cocktailCount = enrichedCocktails.length;
    const stockInput = enrichedCocktails.map((ec) => ({
      servesAllocated:
        ec.servesAllocated ||
        (cocktailCount > 0 ? Math.floor(totalServes / cocktailCount) : 0),
      iceAmountG: ec.cocktail?.iceAmountG ?? null,
      iceType: ec.cocktail?.iceType ?? null,
      straw: ec.cocktail?.straw ?? null,
      strawType: ec.cocktail?.strawType ?? null,
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
    const eventStockItems = await fetchEventStock(id);
    const stock = calculateStock(stockInput, {
      eventStockItems,
      stationCount: event.stationCount,
    });

    const safeEvent =
      session.role === "partner" ? stripPartnerFinancials(event) : event;

    const { buffer: pdfBuffer, usedFallback } = await renderBriefWithFallback(
      () =>
        renderToBuffer(
          BriefPDF({ event: safeEvent, contacts, cocktails: enrichedCocktails, stock, standardNotes })
        ),
      () =>
        renderToBuffer(
          TextOnlyBriefPDF({ event: safeEvent, contacts, cocktails: enrichedCocktails, stock, standardNotes })
        )
    );

    if (usedFallback) {
      console.warn(`PDF: served text-only fallback for event ${id}`);
    }

    const filename = `brief-${event.eventName.replace(/[^a-zA-Z0-9]/g, "-")}${usedFallback ? "-text-only" : ""}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("PDF generation failed entirely:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
