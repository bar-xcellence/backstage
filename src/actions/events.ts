"use server";

import { db } from "@/db";
import { events, eventContacts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { validateEvent } from "@/lib/event-validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateChecklist } from "./checklists";

export async function createEvent(
  formData: FormData
): Promise<{ errors?: string[]; id?: string }> {
  const session = await requireRole("owner", "super_admin");

  const data = {
    eventName: formData.get("eventName") as string,
    eventDate: formData.get("eventDate") as string,
    venueName: formData.get("venueName") as string,
    guestCount: Number(formData.get("guestCount")),
  };

  const errors = validateEvent(data);
  if (errors.length > 0) {
    return { errors };
  }

  const [event] = await db
    .insert(events)
    .values({
      eventName: data.eventName.trim(),
      eventDate: data.eventDate,
      venueName: data.venueName.trim(),
      guestCount: data.guestCount,
      showName: (formData.get("showName") as string)?.trim() || null,
      eventType:
        (formData.get("eventType") as
          | "masterclass"
          | "drinks_reception"
          | "team_building"
          | "corporate"
          | "exhibition"
          | "other") || "corporate",
      serviceType:
        (formData.get("serviceType") as
          | "cocktails_mocktails"
          | "smoothies"
          | "hybrid") || "cocktails_mocktails",
      prepaidServes: Number(formData.get("prepaidServes")) || null,
      stationCount: Number(formData.get("stationCount")) || null,
      staffCount: Number(formData.get("staffCount")) || null,
      arriveTime: (formData.get("arriveTime") as string) || null,
      setupDeadline: (formData.get("setupDeadline") as string) || null,
      serviceStart: (formData.get("serviceStart") as string) || null,
      serviceEnd: (formData.get("serviceEnd") as string) || null,
      departTime: (formData.get("departTime") as string) || null,
      venueHallRoom:
        (formData.get("venueHallRoom") as string)?.trim() || null,
      installInstructions:
        (formData.get("installInstructions") as string)?.trim() || null,
      parkingInstructions:
        (formData.get("parkingInstructions") as string)?.trim() || null,
      accessRoute: (formData.get("accessRoute") as string)?.trim() || null,
      stationLayoutNotes:
        (formData.get("stationLayoutNotes") as string)?.trim() || null,
      batchingInstructions:
        (formData.get("batchingInstructions") as string)?.trim() || null,
      invoiceAmount: (formData.get("invoiceAmount") as string) || null,
      notesCustom: (formData.get("notesCustom") as string)?.trim() || null,
      createdBy: session.userId,
      status: "enquiry",
    })
    .returning({ id: events.id });

  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}

export async function updateEvent(
  id: string,
  formData: FormData
): Promise<{ errors?: string[] }> {
  await requireRole("owner", "super_admin");

  const data = {
    eventName: formData.get("eventName") as string,
    eventDate: formData.get("eventDate") as string,
    venueName: formData.get("venueName") as string,
    guestCount: Number(formData.get("guestCount")),
  };

  const errors = validateEvent(data);
  if (errors.length > 0) {
    return { errors };
  }

  await db
    .update(events)
    .set({
      eventName: data.eventName.trim(),
      eventDate: data.eventDate,
      venueName: data.venueName.trim(),
      guestCount: data.guestCount,
      showName: (formData.get("showName") as string)?.trim() || null,
      eventType:
        (formData.get("eventType") as
          | "masterclass"
          | "drinks_reception"
          | "team_building"
          | "corporate"
          | "exhibition"
          | "other") || "corporate",
      serviceType:
        (formData.get("serviceType") as
          | "cocktails_mocktails"
          | "smoothies"
          | "hybrid") || "cocktails_mocktails",
      prepaidServes: Number(formData.get("prepaidServes")) || null,
      stationCount: Number(formData.get("stationCount")) || null,
      staffCount: Number(formData.get("staffCount")) || null,
      arriveTime: (formData.get("arriveTime") as string) || null,
      setupDeadline: (formData.get("setupDeadline") as string) || null,
      serviceStart: (formData.get("serviceStart") as string) || null,
      serviceEnd: (formData.get("serviceEnd") as string) || null,
      departTime: (formData.get("departTime") as string) || null,
      venueHallRoom:
        (formData.get("venueHallRoom") as string)?.trim() || null,
      installInstructions:
        (formData.get("installInstructions") as string)?.trim() || null,
      parkingInstructions:
        (formData.get("parkingInstructions") as string)?.trim() || null,
      accessRoute: (formData.get("accessRoute") as string)?.trim() || null,
      stationLayoutNotes:
        (formData.get("stationLayoutNotes") as string)?.trim() || null,
      batchingInstructions:
        (formData.get("batchingInstructions") as string)?.trim() || null,
      invoiceAmount: (formData.get("invoiceAmount") as string) || null,
      costAmount: (formData.get("costAmount") as string) || null,
      stockReturnPolicy:
        (formData.get("stockReturnPolicy") as string)?.trim() || null,
      notesCustom: (formData.get("notesCustom") as string)?.trim() || null,
      status:
        (formData.get("status") as
          | "enquiry"
          | "confirmed"
          | "preparation"
          | "ready"
          | "delivered"
          | "cancelled") || undefined,
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));

  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  return {};
}

export async function getEvent(id: string) {
  const session = await requireRole("owner", "super_admin", "partner");

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event) return null;

  // Partner can only see confirmed+ events
  if (
    session.role === "partner" &&
    !["confirmed", "preparation", "ready", "delivered"].includes(event.status)
  ) {
    return null;
  }

  const contacts = await db
    .select()
    .from(eventContacts)
    .where(eq(eventContacts.eventId, id))
    .orderBy(eventContacts.sortOrder);

  // Strip financial data for partner
  if (session.role === "partner") {
    return {
      ...event,
      invoiceAmount: null,
      costAmount: null,
      stockReturnPolicy: null,
      cardPaymentPrice: null,
      cardPaymentCommission: null,
      contacts,
    };
  }

  return { ...event, contacts };
}

export async function listEvents() {
  const session = await requireRole("owner", "super_admin", "partner");

  let allEvents = await db
    .select()
    .from(events)
    .orderBy(desc(events.eventDate));

  // Partner: filter to confirmed+ and strip financials
  if (session.role === "partner") {
    allEvents = allEvents
      .filter((e) =>
        ["confirmed", "preparation", "ready", "delivered"].includes(e.status)
      )
      .map((e) => ({
        ...e,
        invoiceAmount: null,
        costAmount: null,
        stockReturnPolicy: null,
        cardPaymentPrice: null,
        cardPaymentCommission: null,
      }));
  }

  return allEvents;
}

const VALID_STATUSES = ["enquiry", "confirmed", "preparation", "ready", "delivered", "cancelled"] as const;

export async function updateEventStatus(id: string, status: string) {
  await requireRole("owner", "super_admin");

  if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    throw new Error("Invalid status");
  }

  await db
    .update(events)
    .set({
      status: status as typeof VALID_STATUSES[number],
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));

  // Auto-generate checklist when event moves to confirmed
  if (status === "confirmed") {
    await generateChecklist(id);
  }

  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
}
