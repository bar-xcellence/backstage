import { describe, it, expect } from "vitest";
import {
  resolveLCEmail,
  resolveFromEmail,
  resolveSendRecipients,
  escapeHtml,
} from "./lc-email";

describe("resolveLCEmail", () => {
  it("resolves the literal 'Rory' to rory@lc-group.com", () => {
    expect(resolveLCEmail("Rory")).toEqual({ email: "rory@lc-group.com" });
  });

  it("accepts a valid email address as-is", () => {
    expect(resolveLCEmail("rory@lc-group.com")).toEqual({
      email: "rory@lc-group.com",
    });
  });

  it("trims whitespace around a valid email", () => {
    expect(resolveLCEmail("  chef@venue.co.uk  ")).toEqual({
      email: "chef@venue.co.uk",
    });
  });

  it("rejects null with an error", () => {
    const result = resolveLCEmail(null);
    expect(result).toHaveProperty("error");
  });

  it("rejects empty string with an error", () => {
    expect(resolveLCEmail("")).toHaveProperty("error");
  });

  it("rejects a plain name like 'Murdo' (not an email, not 'Rory')", () => {
    expect(resolveLCEmail("Murdo")).toHaveProperty("error");
  });

  it("rejects a malformed email like 'nope@'", () => {
    expect(resolveLCEmail("nope@")).toHaveProperty("error");
  });
});

describe("resolveFromEmail", () => {
  it("prefers a valid DB value over a valid env value", () => {
    expect(
      resolveFromEmail("settings@bar-excellence.com", "env@bar-excellence.com")
    ).toEqual({ email: "settings@bar-excellence.com" });
  });

  it("falls back to env when DB is empty", () => {
    expect(resolveFromEmail(null, "env@bar-excellence.com")).toEqual({
      email: "env@bar-excellence.com",
    });
  });

  it("falls back to env when DB is whitespace-only", () => {
    expect(resolveFromEmail("   ", "env@bar-excellence.com")).toEqual({
      email: "env@bar-excellence.com",
    });
  });

  it("falls back to env when DB value is malformed", () => {
    expect(resolveFromEmail("not an email", "env@bar-excellence.com")).toEqual(
      { email: "env@bar-excellence.com" }
    );
  });

  it("trims surrounding whitespace before validating", () => {
    expect(resolveFromEmail("  no-reply@bar-excellence.com  ", null)).toEqual({
      email: "no-reply@bar-excellence.com",
    });
  });

  it("returns an error when both DB and env are missing", () => {
    expect(resolveFromEmail(null, null)).toHaveProperty("error");
    expect(resolveFromEmail(undefined, "")).toHaveProperty("error");
  });

  it("surfaces the DB error message when DB is set but invalid and env is missing", () => {
    const result = resolveFromEmail("nope@", null);
    expect(result).toHaveProperty("error");
    if ("error" in result) {
      expect(result.error).toMatch(/nope@/);
    }
  });
});

describe("resolveSendRecipients", () => {
  it("returns a single To and empty CC list for a basic input", () => {
    expect(
      resolveSendRecipients({ to: "rory@lc-group.com" })
    ).toEqual({ to: "rory@lc-group.com", cc: [] });
  });

  it("trims To and CC entries", () => {
    expect(
      resolveSendRecipients({
        to: "  rory@lc-group.com  ",
        cc: ["  ops@lc-group.com  "],
      })
    ).toEqual({ to: "rory@lc-group.com", cc: ["ops@lc-group.com"] });
  });

  it("drops empty/whitespace CC entries silently", () => {
    expect(
      resolveSendRecipients({
        to: "rory@lc-group.com",
        cc: ["", "   ", null, undefined, "ops@lc-group.com"],
      })
    ).toEqual({ to: "rory@lc-group.com", cc: ["ops@lc-group.com"] });
  });

  it("dedupes CC against To (case-insensitive)", () => {
    expect(
      resolveSendRecipients({
        to: "Rory@LC-Group.com",
        cc: ["rory@lc-group.com", "ops@lc-group.com"],
      })
    ).toEqual({ to: "Rory@LC-Group.com", cc: ["ops@lc-group.com"] });
  });

  it("dedupes CC entries amongst themselves (case-insensitive)", () => {
    expect(
      resolveSendRecipients({
        to: "rory@lc-group.com",
        cc: ["Ops@LC-Group.com", "ops@lc-group.com", "ops@lc-group.com"],
      })
    ).toEqual({ to: "rory@lc-group.com", cc: ["Ops@LC-Group.com"] });
  });

  it("rejects missing To", () => {
    expect(resolveSendRecipients({ to: null })).toHaveProperty("error");
    expect(resolveSendRecipients({ to: "   " })).toHaveProperty("error");
  });

  it("rejects an invalid To", () => {
    const result = resolveSendRecipients({ to: "nope@" });
    expect(result).toHaveProperty("error");
  });

  it("rejects when any CC entry is invalid", () => {
    const result = resolveSendRecipients({
      to: "rory@lc-group.com",
      cc: ["ops@lc-group.com", "broken@"],
    });
    expect(result).toHaveProperty("error");
  });
});

describe("escapeHtml", () => {
  it("escapes <, >, &, \", and '", () => {
    expect(escapeHtml(`<script>alert("xss")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  it("escapes ampersand and apostrophe in a venue name", () => {
    expect(escapeHtml("O'Hara & Sons")).toBe("O&#39;Hara &amp; Sons");
  });

  it("returns an empty string for null", () => {
    expect(escapeHtml(null)).toBe("");
  });

  it("returns an empty string for undefined", () => {
    expect(escapeHtml(undefined)).toBe("");
  });

  it("passes through safe characters unchanged", () => {
    expect(escapeHtml("Specsavers Conference 2026")).toBe(
      "Specsavers Conference 2026"
    );
  });

  it("coerces non-string inputs safely", () => {
    expect(escapeHtml(200 as unknown as string)).toBe("200");
  });
});
