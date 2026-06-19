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

// The first arg is the full EventWithContacts shape. These tests only exercise
// a handful of fields, so we keep a minimal fixture and assert its type rather
// than enumerate every column (which silently drifts as the schema grows).
type BriefEvent = Parameters<typeof buildBriefEmailHtml>[0];

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
} as unknown as BriefEvent;

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
      } as BriefEvent,
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
            eventId: "e1",
            contactName: "Alice <admin>",
            contactRole: "Chef & Owner",
            contactPhone: "+44",
            contactEmail: null,
            isPrimary: false,
            isHost: false,
            sortOrder: 0,
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

  it("renders per-cocktail ice type when set (Spec H)", () => {
    const html = buildBriefEmailHtml(
      baseEvent,
      [
        {
          id: "ec1",
          menuName: "Clydeport Celebration",
          menuDescription: null,
          stationNumber: 1,
          servesAllocated: 50,
          cocktail: {
            iceType: "Crushed",
            iceAmountG: 200,
            straw: true,
            strawType: "Black short cardboard",
            referenceImageUrl: null,
          },
          ingredients: [],
          garnishes: [],
        },
      ] as unknown as Parameters<typeof buildBriefEmailHtml>[1],
      emptyStock,
      []
    );
    expect(html).toContain("Crushed");
    expect(html).toContain("Black short cardboard");
  });

  it("renders per-cocktail garnishes in the spec (sync invariant)", () => {
    const html = buildBriefEmailHtml(
      baseEvent,
      [
        {
          id: "ec1",
          menuName: "Spiced Passionstar",
          menuDescription: null,
          stationNumber: 1,
          servesAllocated: 50,
          ingredients: [],
          garnishes: [
            {
              id: "g1",
              garnishName: "Passionfruit quarter",
              quantity: "1",
              quantityUnit: "piece",
              garnishCategory: "fruit",
              sortOrder: 0,
            },
            {
              id: "g2",
              garnishName: "Pineapple leaf",
              quantity: "1",
              quantityUnit: "piece",
              garnishCategory: "botanical",
              sortOrder: 1,
            },
            {
              id: "g3",
              garnishName: "Edible gold dust",
              quantity: "1",
              quantityUnit: "pinch",
              garnishCategory: "decorative",
              sortOrder: 2,
            },
          ],
        },
      ] as unknown as Parameters<typeof buildBriefEmailHtml>[1],
      emptyStock,
      []
    );
    expect(html).toContain("Passionfruit quarter");
    expect(html).toContain("Pineapple leaf");
    expect(html).toContain("Edible gold dust");
  });

  it("renders per-cocktail reference image when URL set (Spec H)", () => {
    const html = buildBriefEmailHtml(
      baseEvent,
      [
        {
          id: "ec1",
          menuName: "Clockwork Orange",
          menuDescription: null,
          stationNumber: null,
          servesAllocated: 50,
          cocktail: {
            iceType: null,
            iceAmountG: null,
            straw: false,
            strawType: null,
            referenceImageUrl: "https://example.com/clockwork.jpg",
          },
          ingredients: [],
          garnishes: [],
        },
      ] as unknown as Parameters<typeof buildBriefEmailHtml>[1],
      emptyStock,
      []
    );
    expect(html).toContain("https://example.com/clockwork.jpg");
    expect(html).toContain("<img");
  });

  it("absolutises a relative reference image URL against baseUrl for email (Spec H)", () => {
    const cocktail = [
      {
        id: "ec1",
        menuName: "Spiced Passionstar",
        menuDescription: null,
        stationNumber: null,
        servesAllocated: 50,
        cocktail: {
          iceType: null,
          iceAmountG: null,
          straw: false,
          strawType: null,
          referenceImageUrl: "/images/cocktails/spiced_passionstar.webp",
        },
        ingredients: [],
        garnishes: [],
      },
    ] as unknown as Parameters<typeof buildBriefEmailHtml>[1];

    const html = buildBriefEmailHtml(
      baseEvent,
      cocktail,
      emptyStock,
      [],
      "https://backstage.example.com"
    );
    expect(html).toContain(
      'src="https://backstage.example.com/images/cocktails/spiced_passionstar.webp"'
    );

    // Without a baseUrl, the relative path is left intact (graceful degrade).
    const htmlNoBase = buildBriefEmailHtml(baseEvent, cocktail, emptyStock, []);
    expect(htmlNoBase).toContain('src="/images/cocktails/spiced_passionstar.webp"');
  });

  it("omits ice/straw lines when fields are absent (Spec H)", () => {
    const html = buildBriefEmailHtml(
      baseEvent,
      [
        {
          id: "ec1",
          menuName: "No-frills Cocktail",
          menuDescription: null,
          stationNumber: null,
          servesAllocated: 50,
          cocktail: {
            iceType: null,
            iceAmountG: null,
            straw: false,
            strawType: null,
            referenceImageUrl: null,
          },
          ingredients: [],
          garnishes: [],
        },
      ] as unknown as Parameters<typeof buildBriefEmailHtml>[1],
      emptyStock,
      []
    );
    expect(html).not.toContain("Ice:");
    expect(html).not.toContain("Straw:");
    expect(html).not.toContain("<img");
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

  it("renders multi-line address with line breaks when address fields set (Spec G)", () => {
    const html = buildBriefEmailHtml(
      {
        ...baseEvent,
        venueName: "London Hilton Heathrow",
        venueHallRoom: "Terminal 5",
        addressLine1: "Poole Rd",
        addressLine2: "Colnbrook",
        city: "Heathrow",
        postcode: "SL3 0FF",
        venueTenant: "Hexaware",
        cateringPartner: "Lexington Catering",
      } as unknown as Parameters<typeof buildBriefEmailHtml>[0],
      [],
      emptyStock,
      []
    );
    expect(html).toContain("London Hilton Heathrow");
    expect(html).toContain("Terminal 5");
    expect(html).toContain("Poole Rd");
    expect(html).toContain("Colnbrook");
    expect(html).toContain("Heathrow");
    expect(html).toContain("SL3 0FF");
    expect(html).toContain("Hexaware");
    expect(html).toContain("Lexington Catering");
  });

  it("falls back to venueName only when address fields missing (Spec G)", () => {
    const html = buildBriefEmailHtml(
      {
        ...baseEvent,
        venueName: "The Old Pub",
      } as unknown as Parameters<typeof buildBriefEmailHtml>[0],
      [],
      emptyStock,
      []
    );
    expect(html).toContain("The Old Pub");
  });

  it("renders batchingInstructions in its own section when set (Spec E)", () => {
    const html = buildBriefEmailHtml(
      {
        ...baseEvent,
        batchingInstructions: "Pre-pour 40 cocktails on bar top at 17:45.",
      } as unknown as Parameters<typeof buildBriefEmailHtml>[0],
      [],
      emptyStock,
      []
    );
    expect(html).toContain("Pre-pour 40 cocktails on bar top at 17:45.");
    expect(html.toLowerCase()).toContain("batching");
  });

  it("omits batching section when batchingInstructions is null (Spec E)", () => {
    const html = buildBriefEmailHtml(
      { ...baseEvent, batchingInstructions: null } as unknown as Parameters<
        typeof buildBriefEmailHtml
      >[0],
      [],
      emptyStock,
      []
    );
    expect(html.toLowerCase()).not.toContain("batching");
  });

  it("renders pop-up bar size + branding when set (Spec D)", () => {
    const html = buildBriefEmailHtml(
      {
        ...baseEvent,
        popUpBar: true,
        popUpBarSize: "3m curved",
        popUpBarBranding: "Vinyl banner front branding attached seamlessly",
      } as unknown as Parameters<typeof buildBriefEmailHtml>[0],
      [],
      emptyStock,
      []
    );
    expect(html).toContain("3m curved");
    expect(html).toContain("Vinyl banner front branding attached seamlessly");
  });

  it("does not render pop-up bar size/branding when popUpBar is false (Spec D)", () => {
    const html = buildBriefEmailHtml(
      {
        ...baseEvent,
        popUpBar: false,
        popUpBarSize: "3m curved",
        popUpBarBranding: "Should not appear",
      } as unknown as Parameters<typeof buildBriefEmailHtml>[0],
      [],
      emptyStock,
      []
    );
    expect(html).not.toContain("3m curved");
    expect(html).not.toContain("Should not appear");
  });

  it("renders Host: <name> prominently when a contact has isHost=true (Spec C)", () => {
    const html = buildBriefEmailHtml(
      {
        ...baseEvent,
        contacts: [
          {
            id: "c1",
            contactName: "Murdo MacLeod",
            contactRole: "Host (Bar Excellence)",
            contactPhone: "07882084422",
            contactEmail: null,
            isHost: true,
            isPrimary: true,
            sortOrder: 0,
          },
          {
            id: "c2",
            contactName: "Nafisa Ali",
            contactRole: "Venue",
            contactPhone: null,
            contactEmail: "nafisa@example.com",
            isHost: false,
            isPrimary: false,
            sortOrder: 1,
          },
        ],
      } as unknown as Parameters<typeof buildBriefEmailHtml>[0],
      [],
      emptyStock,
      []
    );
    expect(html).toContain("Host:");
    expect(html).toContain("Murdo MacLeod");
  });

  it("omits Host line when no contact has isHost=true (Spec C)", () => {
    const html = buildBriefEmailHtml(
      {
        ...baseEvent,
        contacts: [
          {
            id: "c1",
            contactName: "Nafisa Ali",
            contactRole: "Venue",
            contactPhone: null,
            contactEmail: null,
            isHost: false,
            isPrimary: false,
            sortOrder: 0,
          },
        ],
      } as unknown as Parameters<typeof buildBriefEmailHtml>[0],
      [],
      emptyStock,
      []
    );
    expect(html).not.toContain("Host:");
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
    } as BriefEvent;
    const html = buildBriefEmailHtml(eventWithMarkers, [], emptyStock, []);
    expect(html).not.toContain("WORKAROUND[");
    expect(html).toContain("Real note for LC.");
    expect(html).toContain("4 bottles non-alc gin.");
  });

  it("renders an Equipment section listing item names and quantities", () => {
    const html = buildBriefEmailHtml(baseEvent, [], emptyStock, [], null, [
      {
        id: "eq1",
        eventId: "e1",
        itemName: "Speedpour",
        quantity: 12,
        isFromTemplate: false,
        sortOrder: 0,
      },
      {
        id: "eq2",
        eventId: "e1",
        itemName: "Cocktail shaker (3-piece)",
        quantity: 2,
        isFromTemplate: false,
        sortOrder: 1,
      },
    ]);
    expect(html).toContain("Equipment");
    expect(html).toContain("Speedpour");
    expect(html).toContain("Cocktail shaker (3-piece)");
    expect(html).toContain("12");
  });

  it("omits the Equipment section entirely when no equipment is attached", () => {
    const html = buildBriefEmailHtml(baseEvent, [], emptyStock, [], null, []);
    expect(html).not.toContain(">Equipment<");
  });

  it("escapes HTML in equipment item names", () => {
    const html = buildBriefEmailHtml(baseEvent, [], emptyStock, [], null, [
      {
        id: "eq1",
        eventId: "e1",
        itemName: "Jigger <2cl & 4cl>",
        quantity: 4,
        isFromTemplate: false,
        sortOrder: 0,
      },
    ]);
    expect(html).toContain("Jigger &lt;2cl &amp; 4cl&gt;");
    expect(html).not.toContain("Jigger <2cl & 4cl>");
  });
});
