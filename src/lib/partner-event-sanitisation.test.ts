import { describe, it, expect } from "vitest";
import { stripPartnerFinancials } from "./partner-event-sanitisation";

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
