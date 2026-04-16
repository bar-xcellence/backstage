import { describe, it, expect } from "vitest";
import {
  createMagicLinkToken,
  verifyMagicLinkToken,
  isAllowedEmail,
} from "./auth";

const TEST_SECRET =
  "test-secret-that-is-at-least-32-characters-long-for-hs256-signing";

describe("Magic Link Tokens", () => {
  describe("createMagicLinkToken", () => {
    it("creates a valid JWT with 3 parts", async () => {
      const token = await createMagicLinkToken(
        "murdo@bar-excellence.app",
        TEST_SECRET
      );
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });
  });

  describe("verifyMagicLinkToken", () => {
    it("verifies a valid token and returns the email", async () => {
      const token = await createMagicLinkToken(
        "murdo@bar-excellence.app",
        TEST_SECRET
      );
      const result = await verifyMagicLinkToken(token, TEST_SECRET);
      expect(result.email).toBe("murdo@bar-excellence.app");
    });

    it("rejects an expired token", async () => {
      const token = await createMagicLinkToken(
        "murdo@bar-excellence.app",
        TEST_SECRET,
        "0s"
      );
      await new Promise((r) => setTimeout(r, 100));
      await expect(
        verifyMagicLinkToken(token, TEST_SECRET)
      ).rejects.toThrow();
    });

    it("rejects a tampered token", async () => {
      const token = await createMagicLinkToken(
        "murdo@bar-excellence.app",
        TEST_SECRET
      );
      const tampered = token.slice(0, -5) + "xxxxx";
      await expect(
        verifyMagicLinkToken(tampered, TEST_SECRET)
      ).rejects.toThrow();
    });

    it("rejects a token signed with a different secret", async () => {
      const token = await createMagicLinkToken(
        "murdo@bar-excellence.app",
        TEST_SECRET
      );
      await expect(
        verifyMagicLinkToken(token, "wrong-secret-that-is-also-32-chars-long-xxx")
      ).rejects.toThrow();
    });
  });
});

describe("isAllowedEmail", () => {
  it("accepts known emails", () => {
    expect(isAllowedEmail("murdo@bar-excellence.app")).toBe(true);
    expect(isAllowedEmail("rob@roberthayford.com")).toBe(true);
  });

  it("rejects unknown emails", () => {
    expect(isAllowedEmail("hacker@evil.com")).toBe(false);
    expect(isAllowedEmail("")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isAllowedEmail("MURDO@BAR-EXCELLENCE.APP")).toBe(true);
    expect(isAllowedEmail("Rob@RobertHayford.com")).toBe(true);
  });

  it("trims whitespace", () => {
    expect(isAllowedEmail("  murdo@bar-excellence.app  ")).toBe(true);
  });
});
