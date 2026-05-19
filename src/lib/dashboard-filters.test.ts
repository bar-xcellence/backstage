import { describe, it, expect } from "vitest";
import {
  parseFilters,
  resolveEffectiveRole,
  defaultStatusesForRole,
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
    expect(statuses).toEqual(["enquiry", "confirmed", "preparation", "ready"]);
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
    expect(statuses).toEqual(["enquiry", "confirmed", "preparation", "ready"]);
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

  it("partner: only confirmed-display + provisional-display, no delivered or cancelled", () => {
    expect(defaultStatusesForRole("partner")).toEqual([
      "enquiry",
      "confirmed",
      "preparation",
      "ready",
    ]);
  });
});
