import { describe, it, expect } from "vitest";
import { daysUntil } from "./event-countdown";

describe("daysUntil", () => {
  it("returns 0 when eventDate equals today (UTC)", () => {
    expect(daysUntil("2026-06-15", new Date("2026-06-15T12:00:00Z"))).toBe(0);
  });

  it("returns positive for a future date", () => {
    expect(daysUntil("2026-06-20", new Date("2026-06-15T12:00:00Z"))).toBe(5);
  });

  it("returns negative for a past date", () => {
    expect(daysUntil("2026-06-10", new Date("2026-06-15T12:00:00Z"))).toBe(-5);
  });

  it("is UTC-stable: same instant yields same result regardless of TZ-shifted phrasing", () => {
    // 23:30 UTC on May 31 vs 00:30 UTC on June 1 — different UTC days,
    // so daysUntil("2026-06-01") should differ by exactly one.
    expect(
      daysUntil("2026-06-01", new Date("2026-05-31T23:30:00Z"))
    ).toBe(1);
    expect(
      daysUntil("2026-06-01", new Date("2026-06-01T00:30:00Z"))
    ).toBe(0);
  });

  it("crossing midnight UTC ticks the result by exactly one day", () => {
    const justBefore = new Date("2026-06-15T23:59:59Z");
    const justAfter = new Date("2026-06-16T00:00:01Z");
    const event = "2026-06-20";
    expect(daysUntil(event, justBefore)).toBe(5);
    expect(daysUntil(event, justAfter)).toBe(4);
  });

  it("handles month boundary correctly", () => {
    expect(daysUntil("2026-07-01", new Date("2026-06-30T12:00:00Z"))).toBe(1);
    expect(daysUntil("2026-07-01", new Date("2026-07-01T12:00:00Z"))).toBe(0);
  });

  it("handles year boundary correctly", () => {
    expect(daysUntil("2027-01-01", new Date("2026-12-31T12:00:00Z"))).toBe(1);
  });
});
