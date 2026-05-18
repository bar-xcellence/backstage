import { describe, it, expect } from "vitest";
import { validateRecipientInput } from "@/lib/recipient-validation";

describe("validateRecipientInput", () => {
  it("accepts a label and a valid email", () => {
    expect(
      validateRecipientInput({ label: "Rory · LC", email: "rory@lc-group.com" })
    ).toEqual([]);
  });

  it("rejects missing label", () => {
    const errs = validateRecipientInput({ label: "", email: "x@y.co" });
    expect(errs).toContain("Label is required");
  });

  it("rejects whitespace-only label", () => {
    const errs = validateRecipientInput({ label: "   ", email: "x@y.co" });
    expect(errs).toContain("Label is required");
  });

  it("rejects missing email", () => {
    const errs = validateRecipientInput({ label: "Rory", email: "" });
    expect(errs).toContain("Email is required");
  });

  it("rejects malformed email", () => {
    const errs = validateRecipientInput({ label: "Rory", email: "nope@" });
    expect(errs).toContain("Email is not valid");
  });

  it("accumulates multiple errors", () => {
    const errs = validateRecipientInput({ label: "", email: "" });
    expect(errs.length).toBeGreaterThan(1);
  });
});
