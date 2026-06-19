import { FROM_EMAIL_SETTING_KEY } from "./lc-email";
import { EMAIL_PATTERN } from "./recipient-validation";

/**
 * Pure validator for app_settings values, keyed by setting name.
 * Returns { value: trimmed string | null } on success, or { error } on failure.
 * `null` value means "delete this row" (and for from_email, fall back to env).
 */
export function validateSettingValue(
  key: string,
  rawValue: string | null | undefined
): { value: string | null } | { error: string } {
  const trimmed = rawValue?.trim() ?? "";

  if (key === FROM_EMAIL_SETTING_KEY) {
    if (trimmed === "") {
      return { value: null };
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      return { error: `"${trimmed}" is not a valid email address` };
    }
    return { value: trimmed };
  }

  return { value: trimmed === "" ? null : trimmed };
}
