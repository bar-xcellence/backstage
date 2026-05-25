/**
 * UTC-stable day-difference between a calendar date (YYYY-MM-DD) and "today".
 *
 * Both operands are normalised to UTC midnight, so the result is deterministic
 * across server timezones — the same eventDate always yields the same number
 * for the same instant. Callers can inject `today` for tests.
 *
 * Note: "deterministic across deploys" ≠ "matches the viewer's local day".
 * Near midnight UTC, a user in a non-UTC zone may experience a one-day
 * mismatch with the badge. That UX concern is tracked separately — the math
 * itself is the canonical signal for the dashboard server-render.
 */
export function daysUntil(eventDate: string, today: Date = new Date()): number {
  const target = new Date(eventDate + "T00:00:00Z");
  const midnight = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  return Math.round(
    (target.getTime() - midnight.getTime()) / (1000 * 60 * 60 * 24)
  );
}
