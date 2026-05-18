import { describe, it, expect } from "vitest";
import { stripWorkaroundMarkers } from "./notes-sanitization";

describe("stripWorkaroundMarkers", () => {
  it("returns empty string for null", () => {
    expect(stripWorkaroundMarkers(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(stripWorkaroundMarkers(undefined)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(stripWorkaroundMarkers("")).toBe("");
  });

  it("returns input unchanged when no markers present", () => {
    expect(stripWorkaroundMarkers("Plain notes for LC.")).toBe(
      "Plain notes for LC."
    );
  });

  it("strips a single WORKAROUND prefix and keeps the content", () => {
    expect(
      stripWorkaroundMarkers(
        "WORKAROUND[substitution-stock]: Bring 4 bottles non-alcoholic gin."
      )
    ).toBe("Bring 4 bottles non-alcoholic gin.");
  });

  it("strips multiple WORKAROUND prefixes across lines", () => {
    const input =
      "60-minute masterclass format.\n\nWORKAROUND[substitution-stock]: 4 bottles non-alc gin.\n\nWORKAROUND[per-station-stock]: 13 packs gold duster.";
    const expected =
      "60-minute masterclass format.\n\n4 bottles non-alc gin.\n\n13 packs gold duster.";
    expect(stripWorkaroundMarkers(input)).toBe(expected);
  });

  it("strips case-insensitive markers", () => {
    expect(
      stripWorkaroundMarkers("workaround[host]: Lead is Murdo.")
    ).toBe("Lead is Murdo.");
  });
});
