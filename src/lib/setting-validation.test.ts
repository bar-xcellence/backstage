import { describe, it, expect } from "vitest";
import { validateSettingValue } from "@/lib/setting-validation";
import { FROM_EMAIL_SETTING_KEY } from "@/lib/lc-email";

describe("validateSettingValue", () => {
  describe("from_email", () => {
    it("accepts a valid email", () => {
      expect(
        validateSettingValue(FROM_EMAIL_SETTING_KEY, "no-reply@bar-excellence.com")
      ).toEqual({ value: "no-reply@bar-excellence.com" });
    });

    it("trims surrounding whitespace", () => {
      expect(
        validateSettingValue(FROM_EMAIL_SETTING_KEY, "  ops@bar-excellence.com  ")
      ).toEqual({ value: "ops@bar-excellence.com" });
    });

    it("treats empty string as a clear (returns null value)", () => {
      expect(validateSettingValue(FROM_EMAIL_SETTING_KEY, "")).toEqual({
        value: null,
      });
    });

    it("treats whitespace-only as a clear", () => {
      expect(validateSettingValue(FROM_EMAIL_SETTING_KEY, "   ")).toEqual({
        value: null,
      });
    });

    it("treats null as a clear", () => {
      expect(validateSettingValue(FROM_EMAIL_SETTING_KEY, null)).toEqual({
        value: null,
      });
    });

    it("rejects a malformed email with an error", () => {
      const result = validateSettingValue(FROM_EMAIL_SETTING_KEY, "nope@");
      expect(result).toHaveProperty("error");
    });
  });

  describe("unknown keys", () => {
    it("passes through trimmed value", () => {
      expect(validateSettingValue("foo", "  bar  ")).toEqual({ value: "bar" });
    });

    it("returns null for empty", () => {
      expect(validateSettingValue("foo", "")).toEqual({ value: null });
    });
  });
});
