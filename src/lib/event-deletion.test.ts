import { describe, it, expect } from "vitest";
import { canDeleteEvent, deleteBlockedReason } from "./event-deletion";
import type { DbStatus } from "./dashboard-status";

const DELETABLE: DbStatus[] = [
  "enquiry",
  "confirmed",
  "preparation",
  "ready",
  "delivered",
  "cancelled",
];

describe("canDeleteEvent", () => {
  it.each(DELETABLE)("allows deleting a %s event", (status) => {
    expect(canDeleteEvent(status)).toBe(true);
  });

  it("blocks deleting a completed event (protects finished records)", () => {
    expect(canDeleteEvent("completed")).toBe(false);
  });
});

describe("deleteBlockedReason", () => {
  it("returns null when the event is deletable", () => {
    expect(deleteBlockedReason("enquiry")).toBeNull();
  });

  it("returns a message explaining why a completed event cannot be deleted", () => {
    const reason = deleteBlockedReason("completed");
    expect(reason).toBeTruthy();
    expect(reason).toMatch(/completed/i);
  });
});
