import type { SessionData } from "./auth-config";

type Role = SessionData["role"];

/**
 * Returns true only for roles that may add, remove, or edit cocktails on an event.
 * Partners (read-only) must not trigger this action — calling getAvailableCocktails()
 * server-side for a partner would throw "Forbidden: insufficient permissions".
 */
export function canManageEventCocktails(role: Role): boolean {
  return role === "owner" || role === "super_admin";
}
