"use client";

import { useState } from "react";
import {
  toggleChecklistItem,
  addCustomChecklistItem,
  removeCustomChecklistItem,
} from "@/actions/checklists";

interface ChecklistItem {
  id: string;
  label: string;
  isCompleted: boolean;
  isCustom: boolean;
  completedAt: Date | null;
}

export function EventChecklist({
  eventId,
  items,
  eventStatus,
}: {
  eventId: string;
  items: ChecklistItem[];
  eventStatus: string;
}) {
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);

  // Empty state: event not yet confirmed
  if (items.length === 0 && eventStatus === "enquiry") {
    return (
      <div className="py-12 text-center">
        <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-2">
          Awaiting Confirmation
        </h3>
        <p className="font-[family-name:var(--font-raleway)] text-sm text-grey leading-relaxed max-w-md mx-auto">
          The checklist is generated when this event moves to Confirmed.
          Advance the status to get started.
        </p>
      </div>
    );
  }

  // Empty state: confirmed but no items (shouldn't happen, but safety net)
  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
          No checklist items yet.
        </p>
      </div>
    );
  }

  const completedCount = items.filter((i) => i.isCompleted).length;
  const allDone = completedCount === items.length;

  async function handleToggle(itemId: string) {
    await toggleChecklistItem(itemId, eventId);
  }

  async function handleAddItem() {
    if (!newItem.trim()) return;
    setAdding(true);
    await addCustomChecklistItem(eventId, newItem);
    setNewItem("");
    setAdding(false);
  }

  async function handleRemove(itemId: string) {
    await removeCustomChecklistItem(itemId, eventId);
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <p className="font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey">
          {completedCount} of {items.length} complete
        </p>
        {allDone && (
          <p className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-botanical">
            All items complete. This event is ready.
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-surface-low mb-6">
        <div
          className="h-1 bg-botanical transition-all duration-500"
          style={{
            width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-3 border-b border-outline/10 group"
          >
            <button
              onClick={() => handleToggle(item.id)}
              className="flex items-center gap-3 flex-1 text-left cursor-pointer"
            >
              {/* Checkbox */}
              <span
                className={`w-5 h-5 border-2 flex items-center justify-center shrink-0 transition-colors duration-200 ${
                  item.isCompleted
                    ? "bg-botanical border-botanical"
                    : "border-outline/30 hover:border-gold"
                }`}
              >
                {item.isCompleted && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="text-cream"
                  >
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="square"
                    />
                  </svg>
                )}
              </span>

              {/* Label */}
              <span
                className={`font-[family-name:var(--font-raleway)] text-sm transition-all duration-300 ${
                  item.isCompleted
                    ? "text-grey line-through"
                    : "text-charcoal"
                }`}
              >
                {item.label}
              </span>
            </button>

            {/* Remove button for custom items */}
            {item.isCustom && (
              <button
                onClick={() => handleRemove(item.id)}
                className="opacity-0 group-hover:opacity-100 text-grey hover:text-error text-[10px] font-medium tracking-[0.16em] uppercase transition-all duration-200 cursor-pointer ml-2"
              >
                REMOVE
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add custom item */}
      <div className="flex items-center gap-3 mt-4 pt-4">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddItem();
          }}
          placeholder="Add a custom item..."
          className="flex-1 px-3 py-2.5 bg-surface-low border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:border-gold focus:outline-none transition-colors duration-200 placeholder:text-grey/40 min-h-[44px]"
        />
        <button
          onClick={handleAddItem}
          disabled={!newItem.trim() || adding}
          className="px-5 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-30 min-h-[44px] cursor-pointer"
        >
          ADD
        </button>
      </div>
    </div>
  );
}
