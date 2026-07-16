"use server";

import { db } from "@/db";
import { events, eventContacts, lcRecipients, eventFiles } from "@/db/schema";
import { eq, desc, and, type SQL } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { validateEvent } from "@/lib/event-validation";
import { validateEventFileInput } from "@/lib/event-file-validation";
import { canDeleteEvent, deleteBlockedReason } from "@/lib/event-deletion";
import type { DbStatus } from "@/lib/dashboard-status";
import { stripPartnerEvent } from "@/lib/partner-event-sanitisation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateChecklist } from "./checklists";

async function getDefaultLcRecipientEmail(): Promise<string | null> {
  try {
    const [row] = await db
      .select({ email: lcRecipients.email })
      .from(lcRecipients)
      .where(
        and(
          eq(lcRecipients.isDefaultTo, true),
          eq(lcRecipients.isActive, true)
        )
      )
      .limit(1);
    return row?.email ?? null;
  } catch {
    return null;
  }
}

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

  const defaultRecipientEmail = await getDefaultLcRecipientEmail();

  const [event] = await db
    .insert(events)
    .values({
      eventName: data.eventName.trim(),
      eventDate: data.eventDate,
      venueName: data.venueName.trim(),
      guestCount: data.guestCount,
      lcRecipient: defaultRecipientEmail ?? "Rory",
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
      addressLine1:
        (formData.get("addressLine1") as string)?.trim() || null,
      addressLine2:
        (formData.get("addressLine2") as string)?.trim() || null,
      city: (formData.get("city") as string)?.trim() || null,
      postcode: (formData.get("postcode") as string)?.trim() || null,
      venueTenant: (formData.get("venueTenant") as string)?.trim() || null,
      cateringPartner:
        (formData.get("cateringPartner") as string)?.trim() || null,
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
      lcPayout: (formData.get("lcPayout") as string) || null,
      commissionNote: (formData.get("commissionNote") as string)?.trim() || null,
      elementsSummary: (formData.get("elementsSummary") as string)?.trim() || null,
      createdBy: session.userId,
      status: "enquiry",
    })
    .returning({ id: events.id });

  // Quote uploaded on the new-enquiry form (Spec: event files). The blob is
  // already in storage; this attaches it to the event that now exists.
  //
  // Deliberately non-fatal: a bad quote never blocks event creation, and the
  // insert runs before redirect() below (which throws NEXT_REDIRECT), so it is
  // never skipped. Every failure path logs — the client generates this
  // metadata itself, so a rejection here means something is genuinely wrong,
  // and a silently vanishing quote is the one outcome Murdo would not notice.
  // Worst case he re-uploads from the Files tab.
  const quoteBlobUrl = (formData.get("quoteBlobUrl") as string) || null;
  if (quoteBlobUrl) {
    const quoteInput = {
      category: "quote",
      fileName: (formData.get("quoteFileName") as string) || "",
      blobUrl: quoteBlobUrl,
      fileSize: Number(formData.get("quoteFileSize")) || 0,
    };
    const quoteErrors = validateEventFileInput(quoteInput);
    if (quoteErrors.length > 0) {
      console.error(
        `Dropped quote upload for event ${event.id}:`,
        quoteErrors.join(", ")
      );
    } else {
      try {
        await db.insert(eventFiles).values({
          eventId: event.id,
          category: "quote",
          fileName: quoteInput.fileName.trim(),
          blobUrl: quoteInput.blobUrl,
          fileSize: quoteInput.fileSize,
        });
      } catch (e) {
        console.error(`Failed to attach quote to event ${event.id}:`, e);
      }
    }
  }

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
      addressLine1:
        (formData.get("addressLine1") as string)?.trim() || null,
      addressLine2:
        (formData.get("addressLine2") as string)?.trim() || null,
      city: (formData.get("city") as string)?.trim() || null,
      postcode: (formData.get("postcode") as string)?.trim() || null,
      venueTenant: (formData.get("venueTenant") as string)?.trim() || null,
      cateringPartner:
        (formData.get("cateringPartner") as string)?.trim() || null,
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
      lcPayout: (formData.get("lcPayout") as string) || null,
      commissionNote: (formData.get("commissionNote") as string)?.trim() || null,
      elementsSummary: (formData.get("elementsSummary") as string)?.trim() || null,
      status:
        (formData.get("status") as
          | "enquiry"
          | "confirmed"
          | "preparation"
          | "ready"
          | "delivered"
          | "completed"
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
    !["confirmed", "preparation", "ready", "delivered", "completed"].includes(event.status)
  ) {
    return null;
  }

  const contacts = await db
    .select()
    .from(eventContacts)
    .where(eq(eventContacts.eventId, id))
    .orderBy(eventContacts.sortOrder);

  const fullEvent = { ...event, contacts };
  if (session.role === "partner") {
    return stripPartnerEvent(fullEvent);
  }
  return fullEvent;
}

type EventStatus =
  | "enquiry"
  | "confirmed"
  | "preparation"
  | "ready"
  | "delivered"
  | "completed"
  | "cancelled";

export async function listEvents(options: { status?: EventStatus } = {}) {
  const session = await requireRole("owner", "super_admin", "partner");

  const filters: SQL[] = [];
  if (options.status) {
    filters.push(eq(events.status, options.status));
  }

  const allEvents = await db
    .select()
    .from(events)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(events.eventDate));

  if (session.role === "partner") {
    return allEvents
      .filter((e) =>
        ["confirmed", "preparation", "ready", "delivered", "completed"].includes(e.status)
      )
      .map(stripPartnerEvent);
  }

  return allEvents;
}

const VALID_STATUSES = ["enquiry", "confirmed", "preparation", "ready", "delivered", "completed", "cancelled"] as const;

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
  revalidatePath("/completed");
  revalidatePath(`/events/${id}`);
}

/**
 * Permanently delete an event and (via FK cascade) its cocktails, equipment,
 * stock, contacts, standard notes and checklist. Owner/super_admin only.
 * Blocked for `completed` events — see canDeleteEvent.
 */
export async function deleteEvent(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  await requireRole("owner", "super_admin");

  const [event] = await db
    .select({ status: events.status })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event) return { error: "Event not found" };

  const status = event.status as DbStatus;
  if (!canDeleteEvent(status)) {
    return { error: deleteBlockedReason(status) ?? "Cannot delete this event" };
  }

  await db.delete(events).where(eq(events.id, id));

  revalidatePath("/events");
  revalidatePath("/completed");
  revalidatePath("/");
  revalidatePath(`/events/${id}`);
  return { success: true };
}
