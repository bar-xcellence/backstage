import { describe, it, expect } from "vitest";
import {
  stripPartnerFinancials,
  stripPartnerEvent,
} from "./partner-event-sanitisation";
import { OWNER_ONLY_FIELDS } from "./partner-event-projection";

const baseEvent = {
  id: "evt-1",
  eventName: "Test Event",
  eventDate: "2026-06-01",
  venueName: "The Venue",
  guestCount: 100,
  invoiceAmount: "5000.00",
  costAmount: "2000.00",
  stockReturnPolicy: "Full return within 7 days",
  cardPaymentPrice: "0.02",
  cardPaymentCommission: "0.015",
  status: "confirmed",
};

describe("stripPartnerFinancials", () => {
  it("nulls all five partner-forbidden financial fields", () => {
    const result = stripPartnerFinancials(baseEvent);
    expect(result.invoiceAmount).toBeNull();
    expect(result.costAmount).toBeNull();
    expect(result.stockReturnPolicy).toBeNull();
    expect(result.cardPaymentPrice).toBeNull();
    expect(result.cardPaymentCommission).toBeNull();
  });

  it("preserves non-financial fields untouched", () => {
    const result = stripPartnerFinancials(baseEvent);
    expect(result.id).toBe("evt-1");
    expect(result.eventName).toBe("Test Event");
    expect(result.guestCount).toBe(100);
    expect(result.status).toBe("confirmed");
  });

  it("handles already-null financial fields without error", () => {
    const eventWithNulls = {
      ...baseEvent,
      invoiceAmount: null,
      costAmount: null,
      stockReturnPolicy: null,
      cardPaymentPrice: null,
      cardPaymentCommission: null,
    };
    const result = stripPartnerFinancials(eventWithNulls);
    expect(result.invoiceAmount).toBeNull();
    expect(result.cardPaymentPrice).toBeNull();
  });
});

describe("stripPartnerEvent", () => {
  // Build a full owner-only fixture so we can verify every classified field is
  // nulled by the sanitiser. Any future addition to OWNER_ONLY_FIELDS is
  // automatically exercised because the assertion loop walks the constant.
  const fullEvent = {
    ...baseEvent,
    // Partner-visible passthrough
    venueHallRoom: "Suite 4",
    addressLine1: "1 Bothwell St",
    city: "Glasgow",
    postcode: "G1 2QF",
    venueTenant: null,
    cateringPartner: null,
    elementsSummary: "Cocktails + canapés",
    lcPayout: "1500.00",
    commissionNote: null,
    // Owner-only (sampled — every key in OWNER_ONLY_FIELDS must be present
    // for the strip-everything assertion to be meaningful)
    createdBy: "user-1",
    showName: "Internal nickname",
    arriveTime: "14:00",
    setupDeadline: "16:00",
    serviceStart: "18:00",
    serviceEnd: "21:00",
    departTime: "22:30",
    serviceType: "cocktails_mocktails",
    prepaidServes: 130,
    stationCount: 2,
    stationLayoutNotes: "Stations at entrance",
    batchingInstructions: "Pre-pour at 17:00",
    staffCount: 4,
    staffNames: "Alex, Sam",
    flairRequired: true,
    popUpBar: true,
    popUpBarSupplier: "Acme",
    popUpBarSize: "3m curved",
    popUpBarBranding: "Vinyl wrap",
    dryIce: true,
    menuFrameCount: 2,
    menuNotes: "A4 frames",
    installInstructions: "Use service lift",
    parkingInstructions: "Loading bay B",
    accessRoute: "Through kitchen",
    vehicleReg: "AB12 CDE",
    cardPaymentService: true,
    cardPaymentServes: 50,
    lcRecipient: "Rory",
    lcSentAt: new Date("2026-05-20T10:00:00Z"),
    lcConfirmedAt: null,
    notesCustom: "Owner private notes",
    outcomeNotes: "Went well",
    createdAt: new Date("2026-04-01T10:00:00Z"),
    updatedAt: new Date("2026-05-01T10:00:00Z"),
    lastAlertSentAt: null,
  };

  it("nulls every field listed in OWNER_ONLY_FIELDS", () => {
    const result = stripPartnerEvent(fullEvent) as Record<string, unknown>;
    for (const key of OWNER_ONLY_FIELDS) {
      expect(result[key], `expected ${key} to be nulled`).toBeNull();
    }
  });

  it("nulls all five partner-forbidden financial fields", () => {
    const result = stripPartnerEvent(fullEvent);
    expect(result.invoiceAmount).toBeNull();
    expect(result.costAmount).toBeNull();
    expect(result.stockReturnPolicy).toBeNull();
    expect(result.cardPaymentPrice).toBeNull();
    expect(result.cardPaymentCommission).toBeNull();
  });

  it("preserves partner-visible fields untouched", () => {
    const result = stripPartnerEvent(fullEvent);
    expect(result.id).toBe("evt-1");
    expect(result.eventName).toBe("Test Event");
    expect(result.eventDate).toBe("2026-06-01");
    expect(result.venueName).toBe("The Venue");
    expect(result.venueHallRoom).toBe("Suite 4");
    expect(result.addressLine1).toBe("1 Bothwell St");
    expect(result.city).toBe("Glasgow");
    expect(result.postcode).toBe("G1 2QF");
    expect(result.guestCount).toBe(100);
    expect(result.status).toBe("confirmed");
    expect(result.lcPayout).toBe("1500.00");
    expect(result.elementsSummary).toBe("Cocktails + canapés");
  });

  it("does not throw when owner-only fields are already null", () => {
    const sparse = {
      ...baseEvent,
      arriveTime: null,
      lcSentAt: null,
      batchingInstructions: null,
    };
    const result = stripPartnerEvent(sparse) as Record<string, unknown>;
    expect(result.arriveTime).toBeNull();
    expect(result.lcSentAt).toBeNull();
    expect(result.batchingInstructions).toBeNull();
  });
});
