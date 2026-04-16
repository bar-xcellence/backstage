"use server";

import { db } from "@/db";
import { events, eventChecklists } from "@/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import { shouldSendAlert } from "@/lib/alert-logic";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function checkAndSendAlerts() {
  const now = new Date();
  const todayStr = toDateString(now);
  const in48Hours = new Date(now);
  in48Hours.setDate(in48Hours.getDate() + 2);
  const in48HoursStr = toDateString(in48Hours);

  const urgentEvents = await db
    .select()
    .from(events)
    .where(ne(events.status, "cancelled"));

  const within48 = urgentEvents.filter(
    (e) => e.eventDate >= todayStr && e.eventDate <= in48HoursStr
  );

  if (within48.length === 0) return;

  const eventIds = within48.map((e) => e.id);
  const incompleteItems = await db
    .select({ eventId: eventChecklists.eventId })
    .from(eventChecklists)
    .where(
      and(
        inArray(eventChecklists.eventId, eventIds),
        eq(eventChecklists.isCompleted, false)
      )
    );

  const countByEvent = new Map<string, number>();
  for (const item of incompleteItems) {
    countByEvent.set(item.eventId, (countByEvent.get(item.eventId) || 0) + 1);
  }

  for (const event of within48) {
    const incompleteCount = countByEvent.get(event.id) || 0;

    if (
      shouldSendAlert({
        eventDate: event.eventDate,
        incompleteCount,
        lastAlertSentAt: event.lastAlertSentAt,
      })
    ) {
      try {
        await resend.emails.send({
          from: process.env.FROM_EMAIL || "onboarding@resend.dev",
          to: "murdo@bar-excellence.app",
          subject: `${event.eventName} — ${incompleteCount} checklist items incomplete`,
          text: `${event.eventName} on ${event.eventDate} has ${incompleteCount} incomplete checklist items.\n\nReview at backstage.bar-excellence.app/events/${event.id}`,
        });

        await db
          .update(events)
          .set({ lastAlertSentAt: new Date() })
          .where(eq(events.id, event.id));
      } catch (err) {
        console.error(`Alert email failed for ${event.eventName}:`, err);
      }
    }
  }
}
