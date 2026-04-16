"use server";

import { db } from "@/db";
import { events, eventChecklists } from "@/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/session";

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
