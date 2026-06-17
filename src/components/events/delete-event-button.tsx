"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteEvent } from "@/actions/events";

export function DeleteEventButton({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await deleteEvent(eventId);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      router.push("/events");
    } catch {
      setError("Something went wrong deleting this event. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="px-5 py-2.5 border border-error/40 text-error font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-error hover:text-cream transition-colors duration-200 min-h-[44px] cursor-pointer"
      >
        DELETE
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete event"
        >
          <div
            className="absolute inset-0 bg-charcoal/85 backdrop-blur-[20px]"
            onClick={() => !loading && setConfirming(false)}
          />
          <div className="relative w-full max-w-md bg-charcoal/95 backdrop-blur-[20px] border border-cream/10 p-6">
            <p className="font-[family-name:var(--font-raleway)] text-[10px] font-semibold tracking-[0.2em] uppercase text-error mb-2">
              Delete event
            </p>
            <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-cream tracking-tight mb-3">
              Delete &ldquo;{eventName}&rdquo;?
            </h2>
            <p className="font-[family-name:var(--font-raleway)] text-sm text-cream/70 leading-relaxed mb-6">
              This permanently removes the event and its cocktails, equipment,
              stock and checklist. This cannot be undone.
            </p>

            {error && (
              <p className="font-[family-name:var(--font-raleway)] text-sm text-error mb-4">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="flex-1 px-5 py-3 border border-cream/20 text-cream/60 font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:text-cream hover:border-cream/40 transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-5 py-3 bg-error text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-error/80 transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                {loading ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
