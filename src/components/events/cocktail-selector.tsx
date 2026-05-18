"use client";

import { useState } from "react";
import {
  addCocktailToEvent,
  removeCocktailFromEvent,
  updateEventCocktail,
} from "@/actions/event-cocktails";

interface Cocktail {
  id: string;
  name: string;
  defaultMenuName: string;
  season: string | null;
  isNonAlcoholic: boolean | null;
  iceType?: string | null;
  iceAmountG?: number | null;
  straw?: boolean | null;
  strawType?: string | null;
  referenceImageUrl?: string | null;
}

interface EventCocktailRow {
  id: string;
  cocktailId: string;
  menuName: string;
  menuDescription: string | null;
  stationNumber: number | null;
  servesAllocated: number | null;
  cocktail: Cocktail | null;
}

interface CocktailSelectorProps {
  eventId: string;
  selectedCocktails: EventCocktailRow[];
  availableCocktails: Cocktail[];
  isPartner?: boolean;
}

export function CocktailSelector({
  eventId,
  selectedCocktails,
  availableCocktails,
  isPartner = false,
}: CocktailSelectorProps) {
  const [adding, setAdding] = useState(false);

  const alreadySelectedIds = new Set(
    selectedCocktails.map((sc) => sc.cocktailId)
  );
  const unselected = availableCocktails.filter(
    (c) => !alreadySelectedIds.has(c.id)
  );

  async function handleAdd(cocktailId: string) {
    setAdding(true);
    await addCocktailToEvent(eventId, cocktailId);
    setAdding(false);
  }

  async function handleRemove(eventCocktailId: string) {
    await removeCocktailFromEvent(eventId, eventCocktailId);
  }

  async function handleUpdateServes(
    eventCocktailId: string,
    serves: string
  ) {
    await updateEventCocktail(eventCocktailId, eventId, {
      servesAllocated: serves ? Number(serves) : null,
    });
  }

  async function handleUpdateStation(
    eventCocktailId: string,
    station: string
  ) {
    await updateEventCocktail(eventCocktailId, eventId, {
      stationNumber: station ? Number(station) : null,
    });
  }

  return (
    <div>
      {/* Selected cocktails */}
      {selectedCocktails.length > 0 && (
        <div className="space-y-3 mb-6">
          {selectedCocktails.map((sc) => (
            <div
              key={sc.id}
              className="bg-surface-low p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1">
                <p className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-charcoal">
                  {sc.menuName}
                </p>
                {sc.menuDescription && (
                  <p className="font-[family-name:var(--font-cormorant)] text-sm italic text-gold-ink/70 mt-0.5">
                    {sc.menuDescription}
                  </p>
                )}
                {(sc.cocktail?.iceType || (sc.cocktail?.straw && sc.cocktail?.strawType)) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sc.cocktail?.iceType && (
                      <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-grey bg-cream px-2 py-1">
                        {sc.cocktail.iceType} ice
                        {sc.cocktail.iceAmountG ? ` · ${sc.cocktail.iceAmountG}g` : ""}
                      </span>
                    )}
                    {sc.cocktail?.straw && sc.cocktail?.strawType && (
                      <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-grey bg-cream px-2 py-1">
                        Straw · {sc.cocktail.strawType}
                      </span>
                    )}
                  </div>
                )}
                {sc.cocktail?.referenceImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sc.cocktail.referenceImageUrl}
                    alt={`${sc.menuName} reference`}
                    className="mt-3 max-w-[180px] border border-outline/15"
                  />
                )}
                <div className="flex items-center gap-4 mt-3">
                  <div>
                    <label className="block font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.18em] uppercase text-grey mb-1">
                      Serves
                    </label>
                    <input
                      type="number"
                      defaultValue={sc.servesAllocated ?? ""}
                      placeholder="Auto"
                      readOnly={isPartner}
                      onBlur={
                        isPartner
                          ? undefined
                          : (e) => handleUpdateServes(sc.id, e.target.value)
                      }
                      className={`w-24 px-2 py-1.5 bg-cream border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:outline-none ${isPartner ? "cursor-default opacity-70" : "focus:border-gold"}`}
                    />
                  </div>
                  <div>
                    <label className="block font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.18em] uppercase text-grey mb-1">
                      Station
                    </label>
                    <input
                      type="number"
                      defaultValue={sc.stationNumber ?? ""}
                      placeholder="—"
                      readOnly={isPartner}
                      onBlur={
                        isPartner
                          ? undefined
                          : (e) => handleUpdateStation(sc.id, e.target.value)
                      }
                      className={`w-16 px-2 py-1.5 bg-cream border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:outline-none ${isPartner ? "cursor-default opacity-70" : "focus:border-gold"}`}
                    />
                  </div>
                </div>
              </div>
              {!isPartner && (
                <button
                  onClick={() => handleRemove(sc.id)}
                  className="text-grey hover:text-error text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 cursor-pointer mt-1"
                >
                  REMOVE
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add cocktails */}
      {unselected.length > 0 && (
        <div>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mb-3">
            Add cocktail
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {unselected.map((c) => (
              <button
                key={c.id}
                onClick={() => handleAdd(c.id)}
                disabled={adding}
                className="p-3 bg-surface-low text-left hover:border-gold/40 border border-transparent transition-colors duration-200 disabled:opacity-50 cursor-pointer"
              >
                <p className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-charcoal">
                  {c.defaultMenuName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-grey">
                    {c.season?.replace("_", " ")}
                  </span>
                  {c.isNonAlcoholic && (
                    <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-botanical">
                      NA
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedCocktails.length === 0 && unselected.length === 0 && (
        isPartner ? (
          <div className="py-8">
            <p className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-2">
              Cocktail menu pending
            </p>
            <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
              The cocktail menu hasn&apos;t been finalised yet — check back closer to the event.
            </p>
          </div>
        ) : (
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
            No cocktails available. Add recipes to the library first.
          </p>
        )
      )}
    </div>
  );
}
