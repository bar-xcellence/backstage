import { describe, it, expect } from "vitest";
import { shouldSendAlert } from "./alert-logic";

describe("shouldSendAlert", () => {
  it("returns true when event is within 48 hours and has incomplete items", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(shouldSendAlert({
      eventDate: tomorrow.toISOString().split("T")[0],
      incompleteCount: 3,
      lastAlertSentAt: null,
    })).toBe(true);
  });

  it("returns false when alert was sent within last 24 hours", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(shouldSendAlert({
      eventDate: tomorrow.toISOString().split("T")[0],
      incompleteCount: 3,
      lastAlertSentAt: new Date(),
    })).toBe(false);
  });

  it("returns false when no incomplete items", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(shouldSendAlert({
      eventDate: tomorrow.toISOString().split("T")[0],
      incompleteCount: 0,
      lastAlertSentAt: null,
    })).toBe(false);
  });

  it("returns false when event is more than 48 hours away", () => {
    const inFiveDays = new Date();
    inFiveDays.setDate(inFiveDays.getDate() + 5);
    expect(shouldSendAlert({
      eventDate: inFiveDays.toISOString().split("T")[0],
      incompleteCount: 3,
      lastAlertSentAt: null,
    })).toBe(false);
  });
});
