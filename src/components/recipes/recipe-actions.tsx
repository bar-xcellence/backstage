"use client";

import Link from "next/link";
import { useState } from "react";
import { duplicateRecipe, archiveRecipe } from "@/actions/recipes";

const BTN =
  "font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase min-h-[44px] flex items-center px-3 transition-colors duration-200";

export function RecipeActions({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);

  // The actions redirect on success (Next throws NEXT_REDIRECT, which must
  // propagate). Only reset busy on a genuine failure so the button recovers.
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      if ((err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw err;
      setBusy(false);
      alert("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/recipes/${id}/edit`} className={`${BTN} bg-gold-ink text-cream hover:bg-gold`}>
        Edit
      </Link>
      <button
        type="button"
        disabled={busy}
        className={`${BTN} text-gold-ink hover:underline disabled:opacity-50`}
        onClick={() => run(() => duplicateRecipe(id))}
      >
        Duplicate
      </button>
      <button
        type="button"
        disabled={busy}
        className={`${BTN} text-error hover:underline disabled:opacity-50`}
        onClick={() => {
          if (!confirm("Archive this recipe? It will be hidden from the library and the event picker.")) return;
          run(() => archiveRecipe(id));
        }}
      >
        Archive
      </button>
    </div>
  );
}
