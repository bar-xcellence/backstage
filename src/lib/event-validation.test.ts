import { describe, it, expect } from "vitest";
import { validateEvent, validateSendToLC } from "./event-validation";

describe("Event Validation", () => {
  const validEvent = {
    eventName: "Specsavers Conference",
    eventDate: "2026-05-01",
    venueName: "ICC Birmingham",
    guestCount: 200,
  };

  it("passes with all required fields", () => {
    const errors = validateEvent(validEvent);
    expect(errors).toHaveLength(0);
  });

  it("requires event name", () => {
    const errors = validateEvent({ ...validEvent, eventName: "" });
    expect(errors).toContain("Event name is required");
  });

  it("requires event date", () => {
    const errors = validateEvent({ ...validEvent, eventDate: "" });
    expect(errors).toContain("Event date is required");
  });

  it("requires venue name", () => {
    const errors = validateEvent({ ...validEvent, venueName: "" });
    expect(errors).toContain("Venue name is required");
  });

  it("requires guest count of at least 1", () => {
    const errors = validateEvent({ ...validEvent, guestCount: 0 });
    expect(errors).toContain("Guest count must be at least 1");
  });

  it("rejects negative guest count", () => {
    const errors = validateEvent({ ...validEvent, guestCount: -5 });
    expect(errors).toContain("Guest count must be at least 1");
  });

  it("collects multiple errors at once", () => {
    const errors = validateEvent({
      eventName: "",
      eventDate: "",
      venueName: "",
      guestCount: 0,
    });
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe("Send to LC Validation", () => {
  it("requires at least one cocktail", () => {
    const errors = validateSendToLC({ cocktailCount: 0, prepaidServes: 100 });
    expect(errors).toContain("At least one cocktail must be selected");
  });

  it("requires prepaid serves", () => {
    const errors = validateSendToLC({ cocktailCount: 3, prepaidServes: 0 });
    expect(errors).toContain("Prepaid serves must be set");
  });

  it("passes with cocktails and serves", () => {
    const errors = validateSendToLC({ cocktailCount: 3, prepaidServes: 200 });
    expect(errors).toHaveLength(0);
  });
});
