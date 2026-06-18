import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEvent, updateEvent, updateEventStatus } from "@/actions/events";
import {
  getEventCocktails,
  getAvailableCocktails,
} from "@/actions/event-cocktails";
import { canManageEventCocktails } from "@/lib/role-permissions";
import { calculateStock } from "@/lib/stock-calculator";
import { EventForm } from "@/components/events/event-form";
import { EventTabs } from "@/components/events/event-tabs";
import { CocktailSelector } from "@/components/events/cocktail-selector";
import { StockList } from "@/components/events/stock-list";
import { SendToLCButton } from "@/components/events/send-to-lc-button";
import { DownloadPDFButton } from "@/components/events/download-pdf-button";
import { getEventChecklist } from "@/actions/checklists";
import { EventChecklist } from "@/components/events/event-checklist";
import { getEventEquipment, getEquipmentTemplates } from "@/actions/equipment";
import { getStandardNotes, getEventStandardNotes } from "@/actions/standard-notes";
import { EventEquipment } from "@/components/events/event-equipment";
import { EventStandardNotes } from "@/components/events/event-standard-notes";
import { formatAddressLines } from "@/lib/address-format";
import { STATUS_COLORS, STATUS_ORDER } from "@/lib/constants";
import { toPartnerStatus, type DbStatus } from "@/lib/dashboard-status";

const PARTNER_STATUS_LABELS: Record<string, string> = {
  provisional: "Provisional",
  confirmed: "Confirmed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PARTNER_STATUS_COLORS: Record<string, string> = {
  provisional: "bg-grey/20 text-grey",
  confirmed: "bg-cognac/20 text-cognac",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-error/10 text-error/60",
};

function formatLcPayout(s: string | null): string {
  if (s === null) return "";
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/auth/signin");
  const isPartner = session.role === "partner";
  const event = await getEvent(id);

  if (!event) notFound();

  const eventCocktails = await getEventCocktails(id);
  const availableCocktails = canManageEventCocktails(session.role)
    ? await getAvailableCocktails()
    : [];
  const checklist = isPartner ? [] : await getEventChecklist(id);
  const equipment = await getEventEquipment(id);
  const templates = isPartner ? [] : await getEquipmentTemplates();
  const allStandardNotes = await getStandardNotes();
  const eventNotes = await getEventStandardNotes(id);

  // Calculate stock from selected cocktails
  const stockInput = eventCocktails.map((ec) => {
    const totalServes =
      (event.prepaidServes || 0) + (event.cardPaymentServes || 0);
    const cocktailCount = eventCocktails.length;

    return {
      servesAllocated:
        ec.servesAllocated ||
        (cocktailCount > 0 ? Math.floor(totalServes / cocktailCount) : 0),
      ingredients: ec.ingredients.map((ing) => ({
        ingredientName: ing.ingredientName,
        amount: Number(ing.amount),
        unit: ing.unit as string,
        brand: ing.brand,
        ingredientCategory: (ing.ingredientCategory as string) || "other",
      })),
      garnishes: ec.garnishes.map((g) => ({
        garnishName: g.garnishName,
        quantity: Number(g.quantity),
        quantityUnit: g.quantityUnit || "piece",
      })),
    };
  });

  const stock = calculateStock(stockInput);
  const statusIndex = STATUS_ORDER.indexOf(event.status);

  const spiritCount = new Set(
    eventCocktails.flatMap((ec) =>
      ec.ingredients
        .filter((i) => i.ingredientCategory === "spirit")
        .map((i) => i.ingredientName)
    )
  ).size;

  const ingredientCount = new Set(
    eventCocktails.flatMap((ec) =>
      ec.ingredients.map((i) => i.ingredientName)
    )
  ).size;

  const updateWithId = async (formData: FormData) => {
    "use server";
    return updateEvent(id, formData);
  };

  const advanceStatus = async () => {
    "use server";
    const currentIndex = STATUS_ORDER.indexOf(event.status);
    if (currentIndex < STATUS_ORDER.length - 1) {
      await updateEventStatus(id, STATUS_ORDER[currentIndex + 1]);
    }
  };

  const markAsCompleted = async () => {
    "use server";
    await updateEventStatus(id, "completed");
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "cocktails", label: `Cocktails (${eventCocktails.length})` },
    { id: "stock", label: "Stock List" },
    { id: "equipment", label: `Equipment (${equipment.length})` },
    ...(!isPartner
      ? [
        {
          id: "checklist",
          label: `Checklist (${checklist.filter((c) => c.isCompleted).length}/${checklist.length})`,
        },
        { id: "edit", label: "Edit" },
      ]
      : []),
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/events"
            className="text-grey hover:text-charcoal text-sm transition-colors duration-200"
          >
            &larr;
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-(family-name:--font-cormorant) text-3xl font-light text-charcoal tracking-tight">
                {event.eventName}
              </h1>
              {(() => {
                if (isPartner) {
                  const displayStatus = toPartnerStatus(
                    event.status as DbStatus
                  );
                  return (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium tracking-[0.16em] uppercase ${PARTNER_STATUS_COLORS[displayStatus]}`}
                    >
                      {PARTNER_STATUS_LABELS[displayStatus]}
                    </span>
                  );
                }
                return (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium tracking-[0.16em] uppercase ${STATUS_COLORS[event.status] || STATUS_COLORS.enquiry}`}
                  >
                    {event.status}
                  </span>
                );
              })()}
            </div>
            {!isPartner && event.showName && (
              <p className="font-(family-name:--font-raleway) text-sm text-grey mt-1">
                {event.showName}
              </p>
            )}
          </div>
        </div>

        {!isPartner && (
          <div className="flex items-center gap-3">
            {/* Download PDF */}
            <DownloadPDFButton eventId={id} />

            {/* Send to LC */}
            <SendToLCButton eventId={id} />

            {/* Mark as completed */}
            {event.status === "completed" ? (
              <button
                type="button"
                disabled
                className="px-5 py-2.5 bg-success text-cream font-(family-name:--font-raleway) text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors duration-200 min-h-[44px] cursor-default opacity-80"
              >
                COMPLETED
              </button>
            ) : (
              <form action={markAsCompleted}>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-success text-cream font-(family-name:--font-raleway) text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-success/80 transition-colors duration-200 min-h-[44px] cursor-pointer"
                >
                  MARK AS COMPLETED
                </button>
              </form>
            )}

            {/* Advance status */}
            {statusIndex >= 0 && statusIndex < STATUS_ORDER.length - 1 && (
              <form action={advanceStatus}>
                <button
                  type="submit"
                  className="px-5 py-2.5 border border-gold text-gold-ink font-(family-name:--font-raleway) text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold hover:text-cream transition-colors duration-200 min-h-[44px] cursor-pointer"
                >
                  ADVANCE TO{" "}
                  {STATUS_ORDER[statusIndex + 1].toUpperCase()}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 py-4 mb-6 border-b border-outline/15 font-(family-name:--font-raleway) text-[11px] tracking-[0.16em] uppercase text-grey">
        <span>{event.eventDate}</span>
        <span>{event.venueName}</span>
        {event.city && <span>{event.city}</span>}
        {event.venueHallRoom && <span>{event.venueHallRoom}</span>}
        <span>{event.guestCount} guests</span>
        {!isPartner && event.prepaidServes && (
          <span>{event.prepaidServes} serves</span>
        )}
        {!isPartner && event.stationCount && (
          <span>{event.stationCount} stations</span>
        )}
        {!isPartner && event.popUpBar && (
          <span>
            Pop-up bar
            {event.popUpBarSize ? ` · ${event.popUpBarSize}` : ""}
          </span>
        )}
        {!isPartner && event.lcSentAt && (
          <span className="text-success">
            SENT TO LC{" "}
            {new Date(event.lcSentAt).toLocaleDateString("en-GB")}
          </span>
        )}
      </div>

      {/* Tabs */}
      <EventTabs tabs={tabs}>
        {{
          overview: (
            <div className="space-y-6">
              {/* Times */}
              {!isPartner && (event.arriveTime || event.serviceStart) && (
                <section>
                  <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
                    Times
                  </h2>
                  <div className="flex flex-wrap gap-x-8 gap-y-2 font-(family-name:--font-raleway) text-sm text-gold-ink">
                    {event.arriveTime && (
                      <div>
                        <span className="text-[10px] tracking-[0.18em] uppercase text-grey block">
                          Arrive
                        </span>
                        {event.arriveTime}
                      </div>
                    )}
                    {event.setupDeadline && (
                      <div>
                        <span className="text-[10px] tracking-[0.18em] uppercase text-grey block">
                          Setup by
                        </span>
                        {event.setupDeadline}
                      </div>
                    )}
                    {event.serviceStart && (
                      <div>
                        <span className="text-[10px] tracking-[0.18em] uppercase text-grey block">
                          Service start
                        </span>
                        {event.serviceStart}
                      </div>
                    )}
                    {event.serviceEnd && (
                      <div>
                        <span className="text-[10px] tracking-[0.18em] uppercase text-grey block">
                          Service end
                        </span>
                        {event.serviceEnd}
                      </div>
                    )}
                    {event.departTime && (
                      <div>
                        <span className="text-[10px] tracking-[0.18em] uppercase text-grey block">
                          Depart
                        </span>
                        {event.departTime}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Location */}
              {(event.addressLine1 ||
                event.addressLine2 ||
                event.city ||
                event.postcode ||
                event.venueTenant ||
                event.cateringPartner) && (
                  <section>
                    <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
                      Location
                    </h2>
                    <div className="font-(family-name:--font-raleway) text-sm text-gold-ink leading-relaxed space-y-0.5">
                      {formatAddressLines(event).map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </section>
                )}

              {/* Batching */}
              {!isPartner && event.batchingInstructions && (
                <section>
                  <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
                    Batching
                  </h2>
                  <p className="font-(family-name:--font-raleway) text-sm text-gold-ink leading-relaxed whitespace-pre-wrap">
                    {event.batchingInstructions}
                  </p>
                </section>
              )}

              {/* Pop-up bar */}
              {!isPartner && event.popUpBar && (event.popUpBarSize || event.popUpBarBranding) && (
                <section>
                  <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
                    Pop-up Bar
                  </h2>
                  <div className="font-(family-name:--font-raleway) text-sm text-gold-ink leading-relaxed space-y-1">
                    {event.popUpBarSize && (
                      <p>
                        <span className="text-[10px] tracking-[0.18em] uppercase text-grey mr-2">
                          Size
                        </span>
                        {event.popUpBarSize}
                      </p>
                    )}
                    {event.popUpBarBranding && (
                      <p>
                        <span className="text-[10px] tracking-[0.18em] uppercase text-grey mr-2">
                          Branding
                        </span>
                        {event.popUpBarBranding}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Logistics */}
              {!isPartner && event.installInstructions && (
                <section>
                  <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
                    Install Instructions
                  </h2>
                  <p className="font-(family-name:--font-raleway) text-sm text-gold-ink leading-relaxed whitespace-pre-wrap">
                    {event.installInstructions}
                  </p>
                </section>
              )}

              {/* Contacts */}
              {event.contacts && event.contacts.length > 0 && (
                <section>
                  <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
                    Site Contacts
                  </h2>
                  {event.contacts.find((c) => c.isHost) && (
                    <div className="mb-3 pb-3 border-b border-gold/30">
                      <span className="text-[10px] tracking-[0.16em] uppercase text-gold-ink font-semibold">
                        Host
                      </span>
                      <p className="font-[family-name:var(--font-cormorant)] text-lg text-charcoal mt-1">
                        {event.contacts.find((c) => c.isHost)?.contactName}
                        {event.contacts.find((c) => c.isHost)?.contactPhone && (
                          <span className="text-gold-ink text-sm font-(family-name:--font-raleway) ml-3">
                            {event.contacts.find((c) => c.isHost)?.contactPhone}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {event.contacts.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-4 py-2 border-b border-outline/10"
                      >
                        <span className="font-(family-name:--font-raleway) text-sm text-charcoal font-semibold">
                          {c.contactName}
                        </span>
                        {c.contactRole && (
                          <span className="text-[10px] tracking-[0.16em] uppercase text-grey">
                            {c.contactRole}
                          </span>
                        )}
                        {c.contactPhone && (
                          <span className="text-sm text-gold-ink">
                            {c.contactPhone}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* LC Payout — visible to all roles, including partner */}
              {event.lcPayout && (
                <section>
                  <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
                    LC Payout
                  </h2>
                  <div className="font-(family-name:--font-raleway) leading-relaxed">
                    <p className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-charcoal">
                      {formatLcPayout(event.lcPayout)}
                    </p>
                    {event.commissionNote && (
                      <p className="text-sm text-grey mt-2">
                        + {event.commissionNote}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Notes */}
              {!isPartner && event.notesCustom && (
                <section>
                  <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
                    Notes
                  </h2>
                  <p className="font-(family-name:--font-raleway) text-sm text-gold-ink leading-relaxed whitespace-pre-wrap">
                    {event.notesCustom}
                  </p>
                </section>
              )}

              <EventStandardNotes
                eventId={id}
                allNotes={allStandardNotes.map((n) => ({ id: n.id, label: n.label, content: n.content }))}
                selectedNoteIds={eventNotes.map((en) => en.noteId)}
                isPartner={isPartner}
              />
            </div>
          ),

          cocktails: (
            <CocktailSelector
              eventId={id}
              selectedCocktails={eventCocktails}
              availableCocktails={availableCocktails}
              isPartner={isPartner}
            />
          ),

          stock: <StockList stock={stock} />,

          equipment: (
            <EventEquipment
              eventId={id}
              equipment={equipment}
              templates={templates.map((t) => ({ id: t.id, name: t.name }))}
              stationCount={event.stationCount || 1}
              spiritCount={spiritCount}
              ingredientCount={ingredientCount}
              guestCount={event.guestCount || 0}
              isPartner={isPartner}
            />
          ),

          ...(!isPartner ? {
            checklist: (
              <EventChecklist
                eventId={id}
                items={checklist}
                eventStatus={event.status}
              />
            ),
            edit: (
              <EventForm
                action={updateWithId}
                defaultValues={
                  event as unknown as Record<string, string | number | null>
                }
                submitLabel="SAVE CHANGES"
              />
            ),
          } : {}),
        }}
      </EventTabs>
    </div>
  );
}
