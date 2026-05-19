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

export function defaultStatusesForRole(role: Role): DbStatus[] {
  if (role === "partner") {
    // Partner default = confirmed display + provisional display
    // (delivered + cancelled off by default per PRD §5.5)
    return ["enquiry", "confirmed", "preparation", "ready"];
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

  // Statuses
  let statuses: DbStatus[];
  if (params.statuses) {
    const parsed = params.statuses
      .split(",")
      .map((s) => s.trim())
      .filter(isDbStatus);
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
