import { describe, it, expect } from "vitest";
import { buildBriefEmailHtml } from "./brief-email-template";
import type { StockResult } from "./stock-calculator";

const emptyStock: StockResult = {
  ingredients: [],
  garnishes: [],
  manualItems: [],
  ice: [],
  straws: [],
  consumables: [],
  warnings: [],
};

const baseEvent = {
  eventName: "Test Event",
  showName: null,
  eventDate: "2026-05-01",
  venueName: "Test Venue",
  venueHallRoom: null,
  guestCount: 100,
  eventType: "corporate",
  serviceType: "cocktails_mocktails",
  staffCount: 4,
  prepaidServes: 200,
  stationCount: 2,
  popUpBar: false,
  flairRequired: false,
  dryIce: false,
  arriveTime: null,
  setupDeadline: null,
  serviceStart: null,
  serviceEnd: null,
  departTime: null,
  contacts: [],
  installInstructions: null,
  parkingInstructions: null,
  accessRoute: null,
  notesCustom: null,
};

describe("buildBriefEmailHtml", () => {
  it("escapes ampersands in the event name", () => {
    const html = buildBriefEmailHtml(
      { ...baseEvent, eventName: "Johnson & Johnson Gala" },
      [],
      emptyStock,
      []
    );
    expect(html).toContain("Johnson &amp; Johnson Gala");
    expect(html).not.toContain("Johnson & Johnson Gala");
  });

  it("escapes angle brackets and quotes in venue name", () => {
    const html = buildBriefEmailHtml(
      {
        ...baseEvent,
        venueName: `O'Hara <"Catering"> & Sons`,
      },
      [],
      emptyStock,
      []
    );
    expect(html).toContain("O&#39;Hara &lt;&quot;Catering&quot;&gt; &amp; Sons");
  });

  it("escapes HTML in notesCustom while preserving line breaks", () => {
    const html = buildBriefEmailHtml(
      {
        ...baseEvent,
        notesCustom: "Line 1 <b>bold</b>\nLine 2 & more",
      },
      [],
      emptyStock,
      []
    );
    expect(html).toContain(
      "Line 1 &lt;b&gt;bold&lt;/b&gt;<br>Line 2 &amp; more"
    );
  });

  it("escapes contact fields", () => {
    const html = buildBriefEmailHtml(
      {
        ...baseEvent,
        contacts: [
          {
            id: "c1",
            contactName: "Alice <admin>",
            contactRole: "Chef & Owner",
            contactPhone: "+44",
            contactEmail: null,
          },
        ],
      },
      [],
      emptyStock,
      []
    );
    expect(html).toContain("Alice &lt;admin&gt;");
    expect(html).toContain("Chef &amp; Owner");
  });

  it("escapes cocktail menu names and ingredients", () => {
    const html = buildBriefEmailHtml(
      baseEvent,
      [
        {
          id: "ec1",
          menuName: "G&T Special",
          menuDescription: "Refreshing <twist>",
          stationNumber: 1,
          servesAllocated: 50,
          ingredients: [
            {
              id: "i1",
              ingredientName: "Gin & Tonic",
              amount: "50",
              unit: "ml",
              brand: "Brand <test>",
              ingredientCategory: "spirit",
            },
          ],
          garnishes: [],
        },
      ] as unknown as Parameters<typeof buildBriefEmailHtml>[1],
      emptyStock,
      []
    );
    expect(html).toContain("G&amp;T Special");
    expect(html).toContain("Refreshing &lt;twist&gt;");
    expect(html).toContain("Gin &amp; Tonic");
    expect(html).toContain("Brand &lt;test&gt;");
  });

  it("still includes safe strings verbatim (sanity check)", () => {
    const html = buildBriefEmailHtml(
      { ...baseEvent, eventName: "Specsavers Conference" },
      [],
      emptyStock,
      []
    );
    expect(html).toContain("Specsavers Conference");
  });

  it("renders standard notes as Attire-style sections when provided", () => {
    const html = buildBriefEmailHtml(
      baseEvent,
      [],
      emptyStock,
      [
        {
          label: "Attire",
          content:
            "All extended team must arrive to site already in set attire:\n- Black bow ties\n- Black waistcoats",
        },
        {
          label: "Problem Escalation",
          content: "Call Murdo first, not the venue.",
        },
      ]
    );
    expect(html).toContain("Attire");
    expect(html).toContain("Black bow ties");
    expect(html).toContain("Black waistcoats");
    expect(html).toContain("Problem Escalation");
    expect(html).toContain("Call Murdo first");
  });

  it("omits the standard notes block entirely when none are attached", () => {
    const html = buildBriefEmailHtml(baseEvent, [], emptyStock, []);
    expect(html).not.toContain("Black waistcoat, black bow tie");
  });

  it("strips WORKAROUND[id]: prefixes from notesCustom before rendering", () => {
    const eventWithMarkers = {
      ...baseEvent,
      notesCustom:
        "Real note for LC.\n\nWORKAROUND[substitution-stock]: 4 bottles non-alc gin.",
    };
    const html = buildBriefEmailHtml(eventWithMarkers, [], emptyStock, []);
    expect(html).not.toContain("WORKAROUND[");
    expect(html).toContain("Real note for LC.");
    expect(html).toContain("4 bottles non-alc gin.");
  });
});
