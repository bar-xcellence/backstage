import { describe, it, expect } from "vitest";
import {
  toPartnerStatus,
  PARTNER_VISIBLE_STATUSES,
  type DbStatus,
  type DisplayStatus,
} from "./dashboard-status";

describe("toPartnerStatus", () => {
  it("maps enquiry to provisional", () => {
    expect(toPartnerStatus("enquiry")).toBe("provisional");
  });

  it("maps confirmed, preparation, ready to confirmed", () => {
    expect(toPartnerStatus("confirmed")).toBe("confirmed");
    expect(toPartnerStatus("preparation")).toBe("confirmed");
    expect(toPartnerStatus("ready")).toBe("confirmed");
  });

  it("passes delivered and cancelled through unchanged", () => {
    expect(toPartnerStatus("delivered")).toBe("delivered");
    expect(toPartnerStatus("cancelled")).toBe("cancelled");
  });

  it("maps completed to delivered (terminal post-delivery state)", () => {
    expect(toPartnerStatus("completed")).toBe("delivered");
  });

  it("covers all seven db statuses (exhaustiveness pin)", () => {
    const allStatuses: DbStatus[] = [
      "enquiry",
      "confirmed",
      "preparation",
      "ready",
      "delivered",
      "completed",
      "cancelled",
    ];
    const displayStatuses = new Set<DisplayStatus>(
      allStatuses.map(toPartnerStatus)
    );
    expect(displayStatuses).toEqual(
      new Set(["provisional", "confirmed", "delivered", "cancelled"])
    );
  });
});

describe("PARTNER_VISIBLE_STATUSES", () => {
  it("contains only confirmed+ statuses (partner cannot see enquiry or cancelled)", () => {
    // "completed" is the terminal post-delivery state; it maps to the
    // partner-visible "delivered" display, and the /completed page renders for
    // partners — so it stays in the confirmed+ envelope.
    expect(PARTNER_VISIBLE_STATUSES).toEqual([
      "confirmed",
      "preparation",
      "ready",
      "delivered",
      "completed",
    ]);
  });

  it("excludes enquiry (owner-only per CLAUDE.md threat model)", () => {
    expect(PARTNER_VISIBLE_STATUSES).not.toContain("enquiry");
  });

  it("excludes cancelled (owner-only per CLAUDE.md threat model)", () => {
    expect(PARTNER_VISIBLE_STATUSES).not.toContain("cancelled");
  });
});
