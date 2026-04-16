import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveLCEmail, getFromEmail, escapeHtml } from "./lc-email";

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

describe("getFromEmail", () => {
  const originalFromEmail = process.env.FROM_EMAIL;

  beforeEach(() => {
    delete process.env.FROM_EMAIL;
  });

  afterEach(() => {
    if (originalFromEmail === undefined) delete process.env.FROM_EMAIL;
    else process.env.FROM_EMAIL = originalFromEmail;
  });

  it("returns the email when FROM_EMAIL is a valid address", () => {
    process.env.FROM_EMAIL = "no-reply@bar-excellence.com";
    expect(getFromEmail()).toEqual({ email: "no-reply@bar-excellence.com" });
  });

  it("returns an error when FROM_EMAIL is missing", () => {
    expect(getFromEmail()).toHaveProperty("error");
  });

  it("returns an error when FROM_EMAIL is not a valid email", () => {
    process.env.FROM_EMAIL = "not an email";
    expect(getFromEmail()).toHaveProperty("error");
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
