"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { DbStatus } from "@/lib/dashboard-status";

const PARTNER_CHIPS: { label: string; status: DbStatus[]; key: string }[] = [
  { label: "Confirmed", status: ["confirmed", "preparation", "ready"], key: "confirmed" },
  { label: "Provisional", status: ["enquiry"], key: "provisional" },
  { label: "Delivered", status: ["delivered"], key: "delivered" },
  { label: "Cancelled", status: ["cancelled"], key: "cancelled" },
];

const OWNER_CHIPS: { label: string; status: DbStatus[]; key: string }[] = [
  { label: "Enquiry", status: ["enquiry"], key: "enquiry" },
  { label: "Confirmed", status: ["confirmed"], key: "confirmed" },
  { label: "Preparation", status: ["preparation"], key: "preparation" },
  { label: "Ready", status: ["ready"], key: "ready" },
  { label: "Delivered", status: ["delivered"], key: "delivered" },
  { label: "Cancelled", status: ["cancelled"], key: "cancelled" },
];

export function StatusChips({
  variant,
  selectedStatuses,
}: {
  variant: "partner" | "owner";
  selectedStatuses: DbStatus[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shakeKey, setShakeKey] = useState<string | null>(null);

  const chips = variant === "partner" ? PARTNER_CHIPS : OWNER_CHIPS;
  const selectedSet = new Set(selectedStatuses);

  function isChipSelected(chipStatuses: DbStatus[]): boolean {
    return chipStatuses.some((s) => selectedSet.has(s));
  }

  function toggleChip(chip: { status: DbStatus[]; key: string }) {
    const isSelected = isChipSelected(chip.status);
    let next: Set<DbStatus>;
    if (isSelected) {
      next = new Set(selectedStatuses);
      for (const s of chip.status) next.delete(s);
    } else {
      next = new Set(selectedStatuses);
      for (const s of chip.status) next.add(s);
    }

    // Resist deselect if it would empty the set
    if (next.size === 0) {
      setShakeKey(chip.key);
      window.setTimeout(() => setShakeKey(null), 350);
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.set("statuses", Array.from(next).join(","));
    router.push(`/?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Status filter">
      {chips.map((chip) => {
        const selected = isChipSelected(chip.status);
        const shake = shakeKey === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => toggleChip(chip)}
            aria-pressed={selected}
            className={[
              "font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase px-4 py-2.5 min-h-[44px] cursor-pointer transition-colors duration-150",
              selected
                ? "bg-charcoal text-cream border-l-2 border-gold"
                : "border border-gold/30 text-gold hover:border-gold/60",
              shake ? "animate-pulse" : "",
            ].join(" ")}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
