const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function getFromEmail(): { email: string } | { error: string } {
  const value = process.env.FROM_EMAIL;

  if (!value) {
    return { error: "FROM_EMAIL environment variable is not set" };
  }

  const trimmed = value.trim();
  if (!EMAIL_PATTERN.test(trimmed)) {
    return { error: `FROM_EMAIL "${trimmed}" is not a valid email address` };
  }

  return { email: trimmed };
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
