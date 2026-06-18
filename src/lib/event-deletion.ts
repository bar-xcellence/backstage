import type { DbStatus } from "./dashboard-status";

/**
 * Deletion policy for events. An owner may permanently delete any event that is
 * not yet `completed` — completed events are finished records on the /completed
 * page and are protected from accidental loss. Isolated as a pure function so
 * the rule is unit-tested independently of the DB (see deleteEvent action).
 */
export function canDeleteEvent(status: DbStatus): boolean {
  return status !== "completed";
}

/** Human-readable reason a delete is blocked, or null when it is allowed. */
export function deleteBlockedReason(status: DbStatus): string | null {
  if (status === "completed") {
    return "Completed events cannot be deleted. Reopen it first if you need to remove it.";
  }
  return null;
}
