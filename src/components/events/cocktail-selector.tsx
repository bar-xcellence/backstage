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
}

export function CocktailSelector({
  eventId,
  selectedCocktails,
  availableCocktails,
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
                <div className="flex items-center gap-4 mt-3">
                  <div>
                    <label className="block font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.18em] uppercase text-grey mb-1">
                      Serves
                    </label>
                    <input
                      type="number"
                      defaultValue={sc.servesAllocated ?? ""}
                      placeholder="Auto"
                      onBlur={(e) =>
                        handleUpdateServes(sc.id, e.target.value)
                      }
                      className="w-24 px-2 py-1.5 bg-cream border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:border-gold focus:outline-none"
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
                      onBlur={(e) =>
                        handleUpdateStation(sc.id, e.target.value)
                      }
                      className="w-16 px-2 py-1.5 bg-cream border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemove(sc.id)}
                className="text-grey hover:text-error text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 cursor-pointer mt-1"
              >
                REMOVE
              </button>
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
        <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
          No cocktails available. Add recipes to the library first.
        </p>
      )}
    </div>
  );
}
