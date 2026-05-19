import { describe, it, expect } from "vitest";
import { rollUpSummary, type SummaryInputEvent } from "./dashboard-summary";

const makeEvent = (overrides: Partial<SummaryInputEvent> = {}): SummaryInputEvent => ({
  status: "confirmed",
  lcPayout: null,
  invoiceAmount: null,
  lcSentAt: null,
  ...overrides,
});

describe("rollUpSummary — partner totals", () => {
  it("sums confirmed lcPayouts, separately from provisional", () => {
    const events = [
      makeEvent({ status: "confirmed", lcPayout: "1400.00" }),
      makeEvent({ status: "ready", lcPayout: "1000.00" }),       // confirmed display
      makeEvent({ status: "enquiry", lcPayout: "1400.00" }),     // provisional display
      makeEvent({ status: "delivered", lcPayout: "500.00" }),    // not counted in confirmed/provisional
    ];

    const summary = rollUpSummary(events);

    expect(summary.confirmedTotal).toBe(2400);
    expect(summary.provisionalTotal).toBe(1400);
    expect(summary.eventCount).toBe(4);
  });

  it("treats null lcPayout as zero contribution", () => {
    const events = [
      makeEvent({ status: "confirmed", lcPayout: null }),
      makeEvent({ status: "confirmed", lcPayout: "1000.00" }),
    ];
    const summary = rollUpSummary(events);
    expect(summary.confirmedTotal).toBe(1000);
  });
});

describe("rollUpSummary — owner totals", () => {
  it("sums invoiceAmount for delivered events only", () => {
    const events = [
      makeEvent({ status: "delivered", invoiceAmount: "5000.00" }),
      makeEvent({ status: "confirmed", invoiceAmount: "3000.00" }),  // ignored
      makeEvent({ status: "delivered", invoiceAmount: "2000.00" }),
    ];
    const summary = rollUpSummary(events);
    expect(summary.invoicedDeliveredTotal).toBe(7000);
  });

  it("counts confirmed+ events with null lcSentAt as brief-unsent", () => {
    const events = [
      makeEvent({ status: "confirmed", lcSentAt: null }),
      makeEvent({ status: "preparation", lcSentAt: null }),
      makeEvent({ status: "confirmed", lcSentAt: new Date() }),  // sent, not counted
      makeEvent({ status: "enquiry", lcSentAt: null }),          // not confirmed+, not counted
      makeEvent({ status: "delivered", lcSentAt: null }),        // delivered without send is past the gate
    ];
    const summary = rollUpSummary(events);
    expect(summary.briefUnsentCount).toBe(2);
  });
});

describe("rollUpSummary — edge cases", () => {
  it("returns all zeros for an empty list", () => {
    const summary = rollUpSummary([]);
    expect(summary).toEqual({
      eventCount: 0,
      confirmedTotal: 0,
      provisionalTotal: 0,
      invoicedDeliveredTotal: 0,
      briefUnsentCount: 0,
    });
  });

  it("does not count cancelled events in any total", () => {
    const events = [
      makeEvent({ status: "cancelled", lcPayout: "9999.00", invoiceAmount: "9999.00", lcSentAt: null }),
    ];
    const summary = rollUpSummary(events);
    expect(summary.confirmedTotal).toBe(0);
    expect(summary.provisionalTotal).toBe(0);
    expect(summary.invoicedDeliveredTotal).toBe(0);
    expect(summary.briefUnsentCount).toBe(0);
  });
});
