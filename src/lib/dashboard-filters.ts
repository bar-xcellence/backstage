import { PARTNER_VISIBLE_STATUSES, type DbStatus } from "./dashboard-status";

export type Role = "owner" | "super_admin" | "partner";

export type DashboardFilters = {
  month: string; // "YYYY-MM" or "upcoming"
  statuses: DbStatus[];
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentYYYYMM(today: Date): string {
  const y = today.getUTCFullYear();
  const m = String(today.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const ALL_DB_STATUSES: DbStatus[] = [
  "enquiry",
  "confirmed",
  "preparation",
  "ready",
  "delivered",
  "cancelled",
];

function isDbStatus(s: string): s is DbStatus {
  return ALL_DB_STATUSES.includes(s as DbStatus);
}

/**
 * Server-side allow-list of statuses each role may filter by. Partner is
 * constrained to confirmed+ to match the getEvent/listEvents/PDF guards;
 * owner/super_admin may filter by anything in the DB enum.
 */
export function allowedStatusesForRole(role: Role): readonly DbStatus[] {
  if (role === "partner") return PARTNER_VISIBLE_STATUSES;
  return ALL_DB_STATUSES;
}

export function defaultStatusesForRole(role: Role): DbStatus[] {
  if (role === "partner") {
    // Partner default = confirmed-display set (delivered toggleable per
    // PRD §5.5). Enquiry is owner-only — see CLAUDE.md threat model.
    return ["confirmed", "preparation", "ready"];
  }
  // Owner default = everything except cancelled
  return ["enquiry", "confirmed", "preparation", "ready", "delivered"];
}

export function parseFilters(
  params: { month?: string; statuses?: string },
  role: Role,
  today: Date = new Date()
): DashboardFilters {
  // Month
  let month: string;
  if (params.month === "upcoming") {
    month = "upcoming";
  } else if (params.month && MONTH_RE.test(params.month)) {
    month = params.month;
  } else {
    month = currentYYYYMM(today);
  }

  // Statuses — clamp role-supplied input against the per-role allow-list so
  // partners cannot URL-craft `?statuses=enquiry,cancelled` to widen visibility.
  const allowed = allowedStatusesForRole(role);
  let statuses: DbStatus[];
  if (params.statuses) {
    const parsed = params.statuses
      .split(",")
      .map((s) => s.trim())
      .filter(isDbStatus)
      .filter((s): s is DbStatus => allowed.includes(s));
    statuses = parsed.length > 0 ? parsed : defaultStatusesForRole(role);
  } else {
    statuses = defaultStatusesForRole(role);
  }

  return { month, statuses };
}

export function resolveEffectiveRole(
  sessionRole: Role,
  viewAsParam: string | undefined
): Role {
  if (
    (sessionRole === "owner" || sessionRole === "super_admin") &&
    viewAsParam === "partner"
  ) {
    return "partner";
  }
  return sessionRole;
}

// Re-exported for callers that need the partner-visible status list
export { PARTNER_VISIBLE_STATUSES };
