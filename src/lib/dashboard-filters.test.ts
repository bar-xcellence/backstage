import { describe, it, expect } from "vitest";
import {
  parseFilters,
  resolveEffectiveRole,
  defaultStatusesForRole,
  allowedStatusesForRole,
  monthBounds,
} from "./dashboard-filters";

describe("parseFilters — month", () => {
  it("defaults to current YYYY-MM when month is missing", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { month } = parseFilters({}, "owner", today);
    expect(month).toBe("2026-06");
  });

  it("accepts a valid YYYY-MM string", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { month } = parseFilters({ month: "2026-09" }, "owner", today);
    expect(month).toBe("2026-09");
  });

  it("accepts 'upcoming' as a sentinel", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { month } = parseFilters({ month: "upcoming" }, "owner", today);
    expect(month).toBe("upcoming");
  });

  it("falls back to current month when format is invalid", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { month } = parseFilters({ month: "not-a-month" }, "owner", today);
    expect(month).toBe("2026-06");
  });
});

describe("parseFilters — statuses", () => {
  it("uses role default when statuses param is missing (owner)", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters({}, "owner", today);
    expect(statuses).toEqual([
      "enquiry",
      "confirmed",
      "preparation",
      "ready",
      "delivered",
    ]);
  });

  it("uses role default when statuses param is missing (partner)", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters({}, "partner", today);
    expect(statuses).toEqual(["confirmed", "preparation", "ready"]);
  });

  it("parses comma-separated statuses", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters(
      { statuses: "confirmed,delivered" },
      "owner",
      today
    );
    expect(statuses).toEqual(["confirmed", "delivered"]);
  });

  it("drops invalid status values silently", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters(
      { statuses: "confirmed,bogus,delivered" },
      "owner",
      today
    );
    expect(statuses).toEqual(["confirmed", "delivered"]);
  });

  it("falls back to role default when all statuses are invalid", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters({ statuses: "x,y,z" }, "partner", today);
    expect(statuses).toEqual(["confirmed", "preparation", "ready"]);
  });

  it("clamps partner-supplied enquiry to role default (cannot widen via URL)", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters(
      { statuses: "enquiry" },
      "partner",
      today
    );
    expect(statuses).toEqual(["confirmed", "preparation", "ready"]);
  });

  it("clamps partner-supplied cancelled to role default (cannot widen via URL)", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters(
      { statuses: "cancelled" },
      "partner",
      today
    );
    expect(statuses).toEqual(["confirmed", "preparation", "ready"]);
  });

  it("partner can request a subset of allowed statuses", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters(
      { statuses: "confirmed,delivered" },
      "partner",
      today
    );
    expect(statuses).toEqual(["confirmed", "delivered"]);
  });

  it("partner mixing allowed + disallowed only keeps allowed", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters(
      { statuses: "enquiry,confirmed,cancelled,delivered" },
      "partner",
      today
    );
    expect(statuses).toEqual(["confirmed", "delivered"]);
  });

  it("owner is not clamped — can request any DB status", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const { statuses } = parseFilters(
      { statuses: "enquiry,cancelled" },
      "owner",
      today
    );
    expect(statuses).toEqual(["enquiry", "cancelled"]);
  });
});

describe("resolveEffectiveRole", () => {
  it("honours ?viewAs=partner for owner", () => {
    expect(resolveEffectiveRole("owner", "partner")).toBe("partner");
  });

  it("honours ?viewAs=partner for super_admin", () => {
    expect(resolveEffectiveRole("super_admin", "partner")).toBe("partner");
  });

  it("ignores ?viewAs=partner for partner (already partner)", () => {
    expect(resolveEffectiveRole("partner", "partner")).toBe("partner");
  });

  it("ignores any other viewAs value for owner", () => {
    expect(resolveEffectiveRole("owner", "owner")).toBe("owner");
    expect(resolveEffectiveRole("owner", "")).toBe("owner");
    expect(resolveEffectiveRole("owner", undefined)).toBe("owner");
  });
});

describe("defaultStatusesForRole", () => {
  it("owner: all except cancelled", () => {
    expect(defaultStatusesForRole("owner")).toEqual([
      "enquiry",
      "confirmed",
      "preparation",
      "ready",
      "delivered",
    ]);
  });

  it("partner: confirmed-display only (no enquiry, no delivered, no cancelled)", () => {
    expect(defaultStatusesForRole("partner")).toEqual([
      "confirmed",
      "preparation",
      "ready",
    ]);
  });

  it("partner default never contains enquiry (owner-only per threat model)", () => {
    expect(defaultStatusesForRole("partner")).not.toContain("enquiry");
  });

  it("partner default never contains cancelled (owner-only per threat model)", () => {
    expect(defaultStatusesForRole("partner")).not.toContain("cancelled");
  });
});

describe("monthBounds", () => {
  it("'upcoming' uses UTC today as the lower bound (no upper)", () => {
    // Mid-day UTC, well clear of any TZ boundary
    const today = new Date("2026-06-15T12:00:00Z");
    expect(monthBounds("upcoming", today)).toEqual({
      from: "2026-06-15",
      to: null,
    });
  });

  it("'upcoming' lower bound stays UTC-stable across midnight UTC", () => {
    // 23:30 UTC on May 31 — in BST this is 00:30 on June 1, in PST it's 16:30 on May 31.
    // The bound must be the UTC calendar day (2026-05-31), matching how
    // parseFilters' currentYYYYMM resolves the same instant.
    const beforeMidnightUtc = new Date("2026-05-31T23:30:00Z");
    expect(monthBounds("upcoming", beforeMidnightUtc).from).toBe("2026-05-31");

    // 00:30 UTC on June 1 — should roll over.
    const afterMidnightUtc = new Date("2026-06-01T00:30:00Z");
    expect(monthBounds("upcoming", afterMidnightUtc).from).toBe("2026-06-01");
  });

  it("computes inclusive month bounds for a 31-day month", () => {
    const today = new Date("2026-06-15T12:00:00Z");
    expect(monthBounds("2026-05", today)).toEqual({
      from: "2026-05-01",
      to: "2026-05-31",
    });
  });

  it("computes inclusive month bounds for a 30-day month", () => {
    const today = new Date("2026-06-15T12:00:00Z");
    expect(monthBounds("2026-06", today)).toEqual({
      from: "2026-06-01",
      to: "2026-06-30",
    });
  });

  it("handles February in a leap year (2024 = 29 days)", () => {
    const today = new Date("2024-02-15T12:00:00Z");
    expect(monthBounds("2024-02", today)).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
  });

  it("handles February in a non-leap year (2026 = 28 days)", () => {
    const today = new Date("2026-02-15T12:00:00Z");
    expect(monthBounds("2026-02", today)).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });
});

describe("allowedStatusesForRole", () => {
  it("partner allow-list matches the confirmed+ envelope", () => {
    // Includes "completed" — the terminal post-delivery state partners still
    // see (rendered as "delivered"); see PARTNER_VISIBLE_STATUSES.
    expect(allowedStatusesForRole("partner")).toEqual([
      "confirmed",
      "preparation",
      "ready",
      "delivered",
      "completed",
    ]);
  });

  it("owner allow-list contains every DB status", () => {
    const owner = allowedStatusesForRole("owner");
    expect(owner).toContain("enquiry");
    expect(owner).toContain("confirmed");
    expect(owner).toContain("preparation");
    expect(owner).toContain("ready");
    expect(owner).toContain("delivered");
    expect(owner).toContain("completed");
    expect(owner).toContain("cancelled");
  });
});
