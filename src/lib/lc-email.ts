import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EMAIL_PATTERN } from "./recipient-validation";

export const FROM_EMAIL_SETTING_KEY = "from_email";

// Legacy recipient shorthand used before lcRecipient held raw email addresses.
// Kept to avoid breaking events that still store the literal name.
const LEGACY_RORY_EMAIL = "rory@lc-group.com";

export function resolveLCEmail(
  lcRecipient: string | null | undefined
): { email: string } | { error: string } {
  if (!lcRecipient) {
    return { error: "LC recipient is not set on this event" };
  }

  const trimmed = lcRecipient.trim();

  if (trimmed === "Rory") {
    return { email: LEGACY_RORY_EMAIL };
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return {
      error: `LC recipient "${trimmed}" is not a valid email address`,
    };
  }

  return { email: trimmed };
}

/**
 * Pure resolver: pick a valid From address from DB-then-env, or return an error.
 * DB value wins when present and valid; env is the fallback.
 */
export function resolveFromEmail(
  dbValue: string | null | undefined,
  envValue: string | null | undefined
): { email: string } | { error: string } {
  const dbTrimmed = dbValue?.trim();
  if (dbTrimmed && EMAIL_PATTERN.test(dbTrimmed)) {
    return { email: dbTrimmed };
  }

  const envTrimmed = envValue?.trim();
  if (envTrimmed && EMAIL_PATTERN.test(envTrimmed)) {
    return { email: envTrimmed };
  }

  if (dbTrimmed) {
    return { error: `From address "${dbTrimmed}" is not a valid email` };
  }
  if (envTrimmed) {
    return { error: `FROM_EMAIL "${envTrimmed}" is not a valid email address` };
  }
  return { error: "From address not configured. Set it in Settings or FROM_EMAIL env." };
}

async function readFromEmailSetting(): Promise<string | null> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, FROM_EMAIL_SETTING_KEY))
    .limit(1);
  return row?.value ?? null;
}

export async function getFromEmail(): Promise<{ email: string } | { error: string }> {
  let dbValue: string | null = null;
  try {
    dbValue = await readFromEmailSetting();
  } catch (err) {
    // If the DB read fails (e.g. table not migrated yet) fall back to env silently.
    console.error("getFromEmail: app_settings read failed, falling back to env:", err);
  }
  return resolveFromEmail(dbValue, process.env.FROM_EMAIL);
}

/**
 * Validate and dedupe a send recipient set. `to` is required; `cc` may be empty.
 * Trims and lowercases for dedupe; preserves original casing on the way out.
 * Removes any CC entry that duplicates the To address.
 */
export function resolveSendRecipients(input: {
  to: string | null | undefined;
  cc?: ReadonlyArray<string | null | undefined>;
}): { to: string; cc: string[] } | { error: string } {
  const toRaw = input.to?.trim();
  if (!toRaw) {
    return { error: "To address is required" };
  }
  if (!EMAIL_PATTERN.test(toRaw)) {
    return { error: `To address "${toRaw}" is not a valid email` };
  }

  const seen = new Set<string>([toRaw.toLowerCase()]);
  const cc: string[] = [];
  for (const entry of input.cc ?? []) {
    const trimmed = entry?.trim();
    if (!trimmed) continue;
    if (!EMAIL_PATTERN.test(trimmed)) {
      return { error: `CC address "${trimmed}" is not a valid email` };
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cc.push(trimmed);
  }

  return { to: toRaw, cc };
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPE_MAP[c]);
}
