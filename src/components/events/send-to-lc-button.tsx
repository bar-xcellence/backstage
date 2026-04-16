"use client";

import { useState } from "react";
import { sendToLC, confirmResendToLC } from "@/actions/send-to-lc";

export function SendToLCButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    needsConfirmation?: boolean;
  } | null>(null);

  async function handleSend() {
    setLoading(true);
    setResult(null);
    const res = await sendToLC(eventId);
    setLoading(false);
    setResult(res);
  }

  async function handleConfirmResend() {
    setLoading(true);
    setResult(null);
    const res = await confirmResendToLC(eventId);
    setLoading(false);
    setResult(res);
  }

  return (
    <div>
      {/* Confirmation dialog for re-send */}
      {result?.needsConfirmation && (
        <div className="bg-warning/10 border border-warning/20 p-4 mb-4">
          <p className="font-[family-name:var(--font-raleway)] text-sm text-warning mb-3">
            {result.error}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleConfirmResend}
              disabled={loading}
              className="px-5 py-2 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {loading ? "SENDING..." : "SEND AGAIN"}
            </button>
            <button
              onClick={() => setResult(null)}
              className="px-5 py-2 border border-grey/30 text-grey font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:text-charcoal transition-colors duration-200 min-h-[44px] cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Success message */}
      {result?.success && (
        <div className="bg-success/10 border border-success/20 p-4 mb-4">
          <p className="font-[family-name:var(--font-raleway)] text-sm text-success">
            Brief sent to LC successfully
          </p>
        </div>
      )}

      {/* Error message (non-confirmation) */}
      {result?.error && !result?.needsConfirmation && (
        <div className="bg-error/10 border border-error/20 p-4 mb-4">
          <p className="font-[family-name:var(--font-raleway)] text-sm text-error">
            {result.error}
          </p>
        </div>
      )}

      {/* Send button */}
      {!result?.needsConfirmation && (
        <button
          onClick={handleSend}
          disabled={loading}
          className="px-8 py-3 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
        >
          {loading ? "SENDING..." : "SEND TO LC"}
        </button>
      )}
    </div>
  );
}
