"use server";

import { db } from "@/db";
import { events, eventChecklists } from "@/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { checkAndSendAlerts } from "./alerts";
import {
  projectPartnerEvent,
  type PartnerEventCard,
} from "@/lib/partner-event-projection";
import {
  rollUpSummary,
  toPartnerSummary,
  type SummaryTotals,
  type PartnerSummary,
} from "@/lib/dashboard-summary";
import type { DbStatus } from "@/lib/dashboard-status";
import {
  parseFilters,
  resolveEffectiveRole,
  allowedStatusesForRole,
  monthBounds,
  type Role,
  type DashboardFilters,
} from "@/lib/dashboard-filters";
import { eventCocktails } from "@/db/schema";
import { sql } from "drizzle-orm";

export interface DashboardData {
  userName: string;
  nextEvent: {
    id: string;
    eventName: string;
    eventDate: string;
    daysUntil: number;
  } | null;
  eventsThisWeek: number;
  overdueItems: number;
  revenueThisMonth: number;
  actions: Array<{
    eventId: string;
    eventName: string;
    issue: string;
  }>;
  upcoming: Array<{
    id: string;
    eventName: string;
    eventDate: string;
    venueName: string;
    status: string;
    guestCount: number;
  }>;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Monday = 1, so offset is (day === 0 ? 6 : day - 1)
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getDashboardData(): Promise<DashboardData> {
  const session = await requireRole("owner", "super_admin");

  // Fetch all non-cancelled events ordered by eventDate
  const allEvents = await db
    .select()
    .from(events)
    .where(ne(events.status, "cancelled"))
    .orderBy(events.eventDate);

  const now = new Date();
  const todayStr = toDateString(now);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const weekStartStr = toDateString(weekStart);
  const weekEndStr = toDateString(weekEnd);

  // Current month boundaries
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEndStr = toDateString(
    new Date(nextMonth.getTime() - 1)
  );

  // 14 days from now
  const in14Days = new Date(now);
  in14Days.setDate(in14Days.getDate() + 14);
  const in14DaysStr = toDateString(in14Days);

  // Events this week
  const eventsThisWeek = allEvents.filter(
    (e) => e.eventDate >= weekStartStr && e.eventDate <= weekEndStr
  ).length;

  // Revenue this month
  const revenueThisMonth = allEvents
    .filter(
      (e) =>
        e.eventDate >= monthStartStr &&
        e.eventDate <= monthEndStr &&
        e.status === "delivered"
    )
    .reduce((sum, e) => sum + (e.invoiceAmount ? parseFloat(e.invoiceAmount) : 0), 0);

  // Next event (first future event, today or later)
  const futureEvents = allEvents.filter((e) => e.eventDate >= todayStr);
  const nextEventRow = futureEvents[0] ?? null;

  let nextEvent: DashboardData["nextEvent"] = null;
  if (nextEventRow) {
    const eventDate = new Date(nextEventRow.eventDate + "T00:00:00");
    const todayMidnight = new Date(todayStr + "T00:00:00");
    const daysUntil = Math.round(
      (eventDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );
    nextEvent = {
      id: nextEventRow.id,
      eventName: nextEventRow.eventName,
      eventDate: nextEventRow.eventDate,
      daysUntil,
    };
  }

  // Upcoming events (next 14 days, including today)
  const upcoming = futureEvents
    .filter((e) => e.eventDate <= in14DaysStr)
    .map((e) => ({
      id: e.id,
      eventName: e.eventName,
      eventDate: e.eventDate,
      venueName: e.venueName,
      status: e.status,
      guestCount: e.guestCount,
    }));

  // Overdue items: past events not delivered or cancelled
  const overdueItems = allEvents.filter(
    (e) => e.eventDate < todayStr && e.status !== "delivered"
  ).length;

  // Actions needing attention
  const actions: DashboardData["actions"] = [];

  // 1. Confirmed+ events without lcSentAt => "Brief not sent to LC"
  const confirmedStatuses = ["confirmed", "preparation", "ready"];
  const needsBrief = allEvents.filter(
    (e) =>
      confirmedStatuses.includes(e.status) &&
      !e.lcSentAt &&
      e.eventDate >= todayStr
  );
  for (const e of needsBrief) {
    actions.push({
      eventId: e.id,
      eventName: e.eventName,
      issue: "Brief not sent to LC",
    });
  }

  // 2. Events within 48 hours with incomplete checklist items
  const in48Hours = new Date(now);
  in48Hours.setDate(in48Hours.getDate() + 2);
  const in48HoursStr = toDateString(in48Hours);

  const urgentEvents = futureEvents.filter(
    (e) => e.eventDate >= todayStr && e.eventDate <= in48HoursStr
  );

  const urgentEventIds = urgentEvents.map((e) => e.id);

  if (urgentEventIds.length > 0) {
    const incompleteItems = await db
      .select({ eventId: eventChecklists.eventId })
      .from(eventChecklists)
      .where(
        and(
          inArray(eventChecklists.eventId, urgentEventIds),
          eq(eventChecklists.isCompleted, false)
        )
      );

    const countByEvent = new Map<string, number>();
    for (const item of incompleteItems) {
      countByEvent.set(item.eventId, (countByEvent.get(item.eventId) || 0) + 1);
    }

    for (const [eventId, count] of countByEvent) {
      const event = urgentEvents.find((e) => e.id === eventId);
      if (event) {
        actions.push({
          eventId: event.id,
          eventName: event.eventName,
          issue: `${count} incomplete checklist item${count === 1 ? "" : "s"}`,
        });
      }
    }
  }

  // Fire-and-forget: check for 48-hour alerts
  checkAndSendAlerts().catch(console.error);

  return {
    userName: session.name,
    nextEvent,
    eventsThisWeek,
    overdueItems,
    revenueThisMonth,
    actions,
    upcoming,
  };
}

export type OwnerEventCard = {
  id: string;
  eventDate: string;
  eventType: string | null;
  guestCount: number;
  serveCount: number;
  elementsSummary: string | null;
  venueName: string;
  venueHallRoom: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  venueTenant: string | null;
  cateringPartner: string | null;
  status: DbStatus;
  lcPayout: string | null;
  commissionNote: string | null;
  // Owner-only:
  invoiceAmount: string | null;
  costAmount: string | null;
  lcSentAt: Date | null;
  checklistComplete: number;
  checklistTotal: number;
};

export type DashboardEventListResult =
  | { viewerRole: "partner"; events: PartnerEventCard[]; summary: PartnerSummary; globalEventCount: number }
  | { viewerRole: "owner"; events: OwnerEventCard[]; summary: SummaryTotals; globalEventCount: number };


export async function getDashboardEvents(params: {
  month?: string;
  statuses?: string;
  viewAs?: string;
}): Promise<DashboardEventListResult> {
  const session = await requireRole("owner", "super_admin", "partner");
  const sessionRole = session.role as Role;
  const effectiveRole = resolveEffectiveRole(sessionRole, params.viewAs);

  const today = new Date();
  const filters: DashboardFilters = parseFilters(params, effectiveRole, today);

  // Defense-in-depth: re-intersect against the role allow-list inside the
  // action even though parseFilters already clamps. A future caller that
  // bypasses parseFilters (or a refactor that loosens it) won't widen the
  // partner's visibility envelope.
  const allowedStatuses = allowedStatusesForRole(effectiveRole);
  const safeStatuses = filters.statuses.filter((s) =>
    allowedStatuses.includes(s)
  );

  // Count total events globally — used for empty-state branching. Restricted
  // to the role's visibility envelope so partners cannot infer the existence
  // of events outside their allow-list (e.g. owner-private cancelled events).
  const globalCountRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(events)
    .where(inArray(events.status, allowedStatuses as DbStatus[]));
  const globalEventCount = globalCountRows[0]?.n ?? 0;

  const { from, to } = monthBounds(filters.month, today);

  // Build event query
  const allRows = await db
    .select()
    .from(events)
    .where(
      and(
        inArray(events.status, safeStatuses),
        to === null
          ? sql`${events.eventDate} >= ${from}`
          : and(
              sql`${events.eventDate} >= ${from}`,
              sql`${events.eventDate} <= ${to}`
            )
      )
    )
    .orderBy(events.eventDate);

  // Compute serve counts via cocktails join in a single query
  const eventIds = allRows.map((r) => r.id);
  let serveByEvent = new Map<string, number>();
  if (eventIds.length > 0) {
    const serveRows = await db
      .select({
        eventId: eventCocktails.eventId,
        total: sql<number>`coalesce(sum(${eventCocktails.servesAllocated}), 0)::int`,
      })
      .from(eventCocktails)
      .where(inArray(eventCocktails.eventId, eventIds))
      .groupBy(eventCocktails.eventId);
    serveByEvent = new Map(serveRows.map((r) => [r.eventId, r.total]));
  }

  // Summary uses raw rows (all fields) — never escapes the server
  const summary = rollUpSummary(
    allRows.map((r) => ({
      status: r.status,
      lcPayout: r.lcPayout,
      invoiceAmount: r.invoiceAmount,
      lcSentAt: r.lcSentAt,
    }))
  );

  if (effectiveRole === "partner") {
    const partnerEvents: PartnerEventCard[] = allRows.map((r) =>
      projectPartnerEvent(r, serveByEvent.get(r.id) ?? 0)
    );
    return {
      viewerRole: "partner",
      events: partnerEvents,
      summary: toPartnerSummary(summary),
      globalEventCount,
    };
  }

  // Owner / super_admin: fetch checklist counts
  let checklistByEvent = new Map<string, { complete: number; total: number }>();
  if (eventIds.length > 0) {
    const checklistRows = await db
      .select({
        eventId: eventChecklists.eventId,
        complete: sql<number>`sum(case when ${eventChecklists.isCompleted} then 1 else 0 end)::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(eventChecklists)
      .where(inArray(eventChecklists.eventId, eventIds))
      .groupBy(eventChecklists.eventId);
    checklistByEvent = new Map(
      checklistRows.map((r) => [r.eventId, { complete: r.complete, total: r.total }])
    );
  }

  const ownerEvents: OwnerEventCard[] = allRows.map((r) => {
    const checklist = checklistByEvent.get(r.id) ?? { complete: 0, total: 0 };
    return {
      id: r.id,
      eventDate: r.eventDate,
      eventType: r.eventType ?? null,
      guestCount: r.guestCount,
      serveCount: serveByEvent.get(r.id) ?? 0,
      elementsSummary: r.elementsSummary,
      venueName: r.venueName,
      venueHallRoom: r.venueHallRoom,
      addressLine1: r.addressLine1,
      addressLine2: r.addressLine2,
      city: r.city,
      postcode: r.postcode,
      venueTenant: r.venueTenant,
      cateringPartner: r.cateringPartner,
      status: r.status as DbStatus,
      lcPayout: r.lcPayout,
      commissionNote: r.commissionNote,
      invoiceAmount: r.invoiceAmount,
      costAmount: r.costAmount,
      lcSentAt: r.lcSentAt,
      checklistComplete: checklist.complete,
      checklistTotal: checklist.total,
    };
  });

  return { viewerRole: "owner", events: ownerEvents, summary, globalEventCount };
}
