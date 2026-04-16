"use client";

import { useState } from "react";
import {
  applyTemplate,
  addCustomEquipmentItem,
  removeEquipmentItem,
  updateEquipmentQuantity,
} from "@/actions/equipment";

interface EventEquipmentProps {
  eventId: string;
  equipment: Array<{
    id: string;
    itemName: string;
    quantity: number;
    isFromTemplate: boolean;
    sortOrder: number;
  }>;
  templates: Array<{
    id: string;
    name: string;
  }>;
  stationCount: number;
  spiritCount: number;
  ingredientCount: number;
  isPartner: boolean;
}

export function EventEquipment({
  eventId,
  equipment,
  templates,
  stationCount,
  spiritCount,
  ingredientCount,
  isPartner,
}: EventEquipmentProps) {
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [adding, setAdding] = useState(false);

  async function handleApplyTemplate(templateId: string) {
    await applyTemplate(eventId, templateId, stationCount, spiritCount, ingredientCount);
  }

  async function handleUpdateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    await updateEquipmentQuantity(itemId, eventId, quantity);
  }

  async function handleRemove(itemId: string) {
    await removeEquipmentItem(itemId, eventId);
  }

  async function handleAddItem() {
    if (!newItemName.trim() || newItemQty < 1) return;
    setAdding(true);
    await addCustomEquipmentItem(eventId, newItemName, newItemQty);
    setNewItemName("");
    setNewItemQty(1);
    setAdding(false);
  }

  // Empty state
  if (equipment.length === 0 && isPartner) {
    return (
      <div className="py-12 text-center">
        <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-2">
          No Equipment Listed
        </h3>
        <p className="font-[family-name:var(--font-raleway)] text-sm text-grey leading-relaxed max-w-md mx-auto">
          Equipment will appear here once the team has prepared the list for this event.
        </p>
      </div>
    );
  }

  if (equipment.length === 0 && !isPartner) {
    return (
      <div>
        {/* Template selector */}
        {templates.length > 0 && (
          <div className="mb-8">
            <p className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey mb-3">
              Apply Template
            </p>
            <div className="flex flex-wrap gap-3 mb-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleApplyTemplate(t.id)}
                  className="px-5 py-2.5 border border-gold text-gold hover:bg-gold hover:text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors duration-200 min-h-[44px] cursor-pointer"
                >
                  {t.name}
                </button>
              ))}
            </div>
            <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
              Scales equipment based on {stationCount} station{stationCount !== 1 ? "s" : ""}, {spiritCount} spirit{spiritCount !== 1 ? "s" : ""}, {ingredientCount} ingredient{ingredientCount !== 1 ? "s" : ""}.
            </p>
          </div>
        )}

        <div className="py-12 text-center">
          <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-2">
            No Equipment Yet
          </h3>
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey leading-relaxed max-w-md mx-auto">
            Equipment will appear here when you apply a template or add items manually.
          </p>
        </div>

        {/* Add custom item */}
        <div className="flex items-center gap-3 mt-4 pt-4">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddItem();
            }}
            placeholder="Item name..."
            className="flex-1 px-3 bg-cream border border-outline/15 font-[family-name:var(--font-raleway)] text-sm text-charcoal focus:outline-none focus:border-gold min-h-[44px]"
          />
          <input
            type="number"
            value={newItemQty}
            onChange={(e) => setNewItemQty(Number(e.target.value))}
            min={1}
            className="w-20 px-3 bg-cream border border-outline/15 font-[family-name:var(--font-raleway)] text-sm text-charcoal focus:outline-none focus:border-gold min-h-[44px] text-center"
          />
          <button
            onClick={handleAddItem}
            disabled={!newItemName.trim() || adding}
            className="px-5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-30 min-h-[44px] cursor-pointer"
          >
            ADD
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Template selector — owner/super_admin only */}
      {!isPartner && templates.length > 0 && (
        <div className="mb-8">
          <p className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-grey mb-3">
            Apply Template
          </p>
          <div className="flex flex-wrap gap-3 mb-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleApplyTemplate(t.id)}
                className="px-5 py-2.5 border border-gold text-gold hover:bg-gold hover:text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors duration-200 min-h-[44px] cursor-pointer"
              >
                {t.name}
              </button>
            ))}
          </div>
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
            Scales equipment based on {stationCount} station{stationCount !== 1 ? "s" : ""}, {spiritCount} spirit{spiritCount !== 1 ? "s" : ""}, {ingredientCount} ingredient{ingredientCount !== 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {/* Equipment list */}
      <div>
        {equipment.map((item) => (
          <div
            key={item.id}
            className="py-3 border-b border-outline/10 flex items-center justify-between gap-4"
          >
            <span className="font-[family-name:var(--font-raleway)] text-sm text-gold-ink flex-1">
              {item.itemName}
            </span>

            {isPartner ? (
              <span className="font-[family-name:var(--font-raleway)] text-sm text-charcoal font-semibold">
                {item.quantity}
              </span>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  defaultValue={item.quantity}
                  min={1}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (val !== item.quantity && val >= 1) {
                      handleUpdateQuantity(item.id, val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-20 px-3 bg-cream border border-outline/15 font-[family-name:var(--font-raleway)] text-sm text-charcoal focus:outline-none focus:border-gold min-h-[44px] text-center"
                />
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-grey hover:text-charcoal font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase transition-colors duration-200 min-h-[44px] cursor-pointer"
                >
                  REMOVE
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add custom item — owner/super_admin only */}
      {!isPartner && (
        <div className="flex items-center gap-3 mt-4 pt-4">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddItem();
            }}
            placeholder="Item name..."
            className="flex-1 px-3 bg-cream border border-outline/15 font-[family-name:var(--font-raleway)] text-sm text-charcoal focus:outline-none focus:border-gold min-h-[44px]"
          />
          <input
            type="number"
            value={newItemQty}
            onChange={(e) => setNewItemQty(Number(e.target.value))}
            min={1}
            className="w-20 px-3 bg-cream border border-outline/15 font-[family-name:var(--font-raleway)] text-sm text-charcoal focus:outline-none focus:border-gold min-h-[44px] text-center"
          />
          <button
            onClick={handleAddItem}
            disabled={!newItemName.trim() || adding}
            className="px-5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-30 min-h-[44px] cursor-pointer"
          >
            ADD
          </button>
        </div>
      )}
    </div>
  );
}
