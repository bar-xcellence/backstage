import { headers } from "next/headers";

/**
 * Resolve the app's absolute base URL (no trailing slash).
 *
 * Prefers NEXT_PUBLIC_APP_URL; otherwise derives it from the incoming
 * request's forwarded host/proto headers. Returns null when neither is
 * available (e.g. a background context with no request and no env var).
 *
 * Used to absolutise relative asset paths (e.g. cocktail reference images)
 * for outbound email, where relative `src` attributes do not resolve.
 */
export async function resolveBaseUrl(): Promise<string | null> {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

/**
 * Make a possibly-relative URL absolute against `baseUrl`.
 *
 * Leaves already-absolute URLs (http/https/data/protocol-relative) untouched.
 * Returns the original (relative) value when no baseUrl is available so the
 * caller degrades gracefully rather than emitting a broken `null` href.
 */
export function absolutiseUrl(url: string, baseUrl: string | null): string {
  if (/^(https?:|data:|\/\/)/i.test(url)) return url;
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}
