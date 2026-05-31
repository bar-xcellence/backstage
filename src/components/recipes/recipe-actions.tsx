"use client";

import Link from "next/link";
import { useState } from "react";
import { duplicateRecipe, archiveRecipe } from "@/actions/recipes";

const BTN =
  "font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase min-h-[44px] flex items-center px-3 transition-colors duration-200";

export function RecipeActions({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Link href={`/recipes/${id}/edit`} className={`${BTN} bg-gold-ink text-cream hover:bg-gold`}>
        Edit
      </Link>
      <button
        type="button"
        disabled={busy}
        className={`${BTN} text-gold-ink hover:underline disabled:opacity-50`}
        onClick={async () => {
          setBusy(true);
          await duplicateRecipe(id);
        }}
      >
        Duplicate
      </button>
      <button
        type="button"
        disabled={busy}
        className={`${BTN} text-error hover:underline disabled:opacity-50`}
        onClick={async () => {
          if (!confirm("Archive this recipe? It will be hidden from the library and the event picker.")) return;
          setBusy(true);
          await archiveRecipe(id);
        }}
      >
        Archive
      </button>
    </div>
  );
}
