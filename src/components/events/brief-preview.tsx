"use client";

import { useEffect } from "react";
import type { BriefPreviewData } from "@/actions/brief-preview";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h3 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-gold tracking-tight mb-2">
        {title}
      </h3>
      <div className="font-[family-name:var(--font-raleway)] text-sm text-cream/80 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

interface BriefPreviewProps {
  data: BriefPreviewData;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function BriefPreview({
  data,
  onConfirm,
  onCancel,
  loading,
}: BriefPreviewProps) {
  const { event, cocktails, stock } = data;

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const hasContacts = event.contacts && event.contacts.length > 0;
  const hasTimes =
    event.arriveTime ||
    event.setupDeadline ||
    event.serviceStart ||
    event.serviceEnd ||
    event.departTime;
  const hasInstall =
    event.installInstructions ||
    event.parkingInstructions ||
    event.accessRoute;
  const hasNotes =
    event.notesCustom ||
    event.stationLayoutNotes ||
    event.batchingInstructions ||
    event.menuNotes;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/85 backdrop-blur-[20px]"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-charcoal/95 backdrop-blur-[20px] flex flex-col overflow-hidden">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-cream/10 bg-charcoal/95 backdrop-blur-[20px]">
          <div>
            <p className="font-[family-name:var(--font-raleway)] text-[10px] font-semibold tracking-[0.2em] uppercase text-cream/40 mb-1">
              Brief Preview
            </p>
            <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-cream tracking-tight">
              {event.eventName}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="flex items-center justify-center w-[44px] h-[44px] text-cream/40 hover:text-cream transition-colors duration-200 cursor-pointer"
            aria-label="Close preview"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Date */}
          <Section title="Date">
            <p>{event.eventDate}</p>
            {event.guestCount && (
              <p className="mt-1">{event.guestCount} guests</p>
            )}
          </Section>

          {/* Location */}
          <Section title="Location">
            <p>{event.venueName}</p>
            {event.venueHallRoom && (
              <p className="text-cream/50">{event.venueHallRoom}</p>
            )}
          </Section>

          {/* Times */}
          {hasTimes && (
            <Section title="Times">
              <div className="space-y-1">
                {event.arriveTime && <p>Arrive: {event.arriveTime}</p>}
                {event.setupDeadline && (
                  <p>Setup deadline: {event.setupDeadline}</p>
                )}
                {event.serviceStart && (
                  <p>Service start: {event.serviceStart}</p>
                )}
                {event.serviceEnd && <p>Service end: {event.serviceEnd}</p>}
                {event.departTime && <p>Depart: {event.departTime}</p>}
              </div>
            </Section>
          )}

          {/* Site Contacts */}
          {hasContacts && (
            <Section title="Site Contacts">
              <div className="space-y-2">
                {event.contacts.map((c) => (
                  <div key={c.id}>
                    <p className="text-cream font-medium">
                      {c.contactName}
                      {c.contactRole && (
                        <span className="text-cream/50 font-normal ml-2">
                          {c.contactRole}
                        </span>
                      )}
                    </p>
                    {c.contactPhone && (
                      <p className="text-cream/60">{c.contactPhone}</p>
                    )}
                    {c.contactEmail && (
                      <p className="text-cream/60">{c.contactEmail}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Install */}
          {hasInstall && (
            <Section title="Install">
              <div className="space-y-2">
                {event.installInstructions && (
                  <div>
                    <p className="text-cream/50 text-xs uppercase tracking-wider mb-0.5">
                      Install
                    </p>
                    <p>{event.installInstructions}</p>
                  </div>
                )}
                {event.parkingInstructions && (
                  <div>
                    <p className="text-cream/50 text-xs uppercase tracking-wider mb-0.5">
                      Parking
                    </p>
                    <p>{event.parkingInstructions}</p>
                  </div>
                )}
                {event.accessRoute && (
                  <div>
                    <p className="text-cream/50 text-xs uppercase tracking-wider mb-0.5">
                      Access route
                    </p>
                    <p>{event.accessRoute}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Cocktails */}
          {cocktails.length > 0 && (
            <Section title="Cocktails">
              <div className="space-y-4">
                {cocktails.map((ec) => (
                  <div key={ec.id}>
                    <p className="text-cream font-bold">{ec.menuName}</p>
                    {ec.menuDescription && (
                      <p className="text-cream/50 italic mt-0.5">
                        {ec.menuDescription}
                      </p>
                    )}
                    {ec.servesAllocated && (
                      <p className="text-cream/40 text-xs mt-0.5">
                        {ec.servesAllocated} serves
                      </p>
                    )}
                    {ec.ingredients.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {ec.ingredients.map((ing) => (
                          <li key={ing.id} className="text-cream/60 text-xs">
                            {ing.amount}
                            {ing.unit} {ing.ingredientName}
                            {ing.brand && (
                              <span className="text-cream/40">
                                {" "}
                                ({ing.brand})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Stock List */}
          {(stock.ingredients.length > 0 || stock.garnishes.length > 0) && (
            <Section title="Stock List">
              {stock.ingredients.length > 0 && (
                <div className="mb-3">
                  <p className="text-cream/50 text-xs uppercase tracking-wider mb-1">
                    Ingredients
                  </p>
                  <ul className="space-y-0.5">
                    {stock.ingredients.map((ing) => (
                      <li
                        key={`${ing.ingredientName}-${ing.brand || ""}`}
                        className="text-cream/60 text-xs"
                      >
                        {ing.ingredientName}
                        {ing.brand && (
                          <span className="text-cream/40"> ({ing.brand})</span>
                        )}{" "}
                        &mdash; {ing.purchaseUnits} x {ing.bottleSize}ml
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {stock.garnishes.length > 0 && (
                <div>
                  <p className="text-cream/50 text-xs uppercase tracking-wider mb-1">
                    Garnishes
                  </p>
                  <ul className="space-y-0.5">
                    {stock.garnishes.map((g) => (
                      <li key={g.garnishName} className="text-cream/60 text-xs">
                        {g.garnishName} &mdash; {g.totalWithBuffer}{" "}
                        {g.quantityUnit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {stock.manualItems.length > 0 && (
                <div className="mt-3">
                  <p className="text-cream/50 text-xs uppercase tracking-wider mb-1">
                    Manual items
                  </p>
                  <ul className="space-y-0.5">
                    {stock.manualItems.map((m) => (
                      <li
                        key={`${m.ingredientName}-${m.unit}`}
                        className="text-cream/60 text-xs"
                      >
                        {m.ingredientName} &mdash; {m.totalQuantity} {m.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {stock.warnings.length > 0 && (
                <div className="mt-3">
                  {stock.warnings.map((w, i) => (
                    <p key={i} className="text-warning text-xs">
                      {w}
                    </p>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Notes */}
          {hasNotes && (
            <Section title="Notes">
              <div className="space-y-2">
                {event.notesCustom && <p>{event.notesCustom}</p>}
                {event.stationLayoutNotes && (
                  <p>
                    <span className="text-cream/50">Station layout:</span>{" "}
                    {event.stationLayoutNotes}
                  </p>
                )}
                {event.batchingInstructions && (
                  <p>
                    <span className="text-cream/50">Batching:</span>{" "}
                    {event.batchingInstructions}
                  </p>
                )}
                {event.menuNotes && (
                  <p>
                    <span className="text-cream/50">Menu:</span>{" "}
                    {event.menuNotes}
                  </p>
                )}
              </div>
            </Section>
          )}
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 px-6 py-4 border-t border-cream/10 bg-charcoal/95 backdrop-blur-[20px] space-y-2">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full px-8 py-3 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
          >
            {loading ? "SENDING..." : "CONFIRM & SEND"}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full px-8 py-3 border border-cream/20 text-cream/60 font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:text-cream hover:border-cream/40 transition-colors duration-200 min-h-[44px] cursor-pointer"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
