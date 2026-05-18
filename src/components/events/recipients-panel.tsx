"use client";

import { useState } from "react";
import type { SavedRecipientOption } from "@/actions/brief-preview";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RecipientsPanelProps {
  to: string;
  cc: string[];
  savedRecipients: SavedRecipientOption[];
  onChange: (next: { to: string; cc: string[] }) => void;
}

export function RecipientsPanel({
  to,
  cc,
  savedRecipients,
  onChange,
}: RecipientsPanelProps) {
  const savedEmailSet = new Set(
    savedRecipients.map((r) => r.email.toLowerCase())
  );
  const isToCustom =
    to.trim() !== "" && !savedEmailSet.has(to.trim().toLowerCase());

  const [toMode, setToMode] = useState<"saved" | "custom">(
    isToCustom ? "custom" : "saved"
  );

  // CC controls
  const [ccDraft, setCcDraft] = useState("");
  const [ccError, setCcError] = useState<string | null>(null);

  const availableForCc = savedRecipients.filter(
    (r) =>
      r.email.trim() !== "" &&
      r.email.toLowerCase() !== to.trim().toLowerCase() &&
      !cc.some((e) => e.toLowerCase() === r.email.toLowerCase())
  );

  function setTo(next: string) {
    onChange({ to: next, cc });
  }

  function addCc(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!EMAIL_PATTERN.test(trimmed)) {
      setCcError(`"${trimmed}" is not a valid email`);
      return;
    }
    if (trimmed.toLowerCase() === to.trim().toLowerCase()) {
      setCcError("Already the To recipient");
      return;
    }
    if (cc.some((e) => e.toLowerCase() === trimmed.toLowerCase())) {
      setCcError("Already in CC");
      return;
    }
    setCcError(null);
    setCcDraft("");
    onChange({ to, cc: [...cc, trimmed] });
  }

  function removeCc(email: string) {
    onChange({ to, cc: cc.filter((e) => e !== email) });
  }

  function handleCcKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCc(ccDraft);
    }
  }

  return (
    <section className="mb-6 border border-cream/15 p-4 bg-charcoal/40">
      <h3 className="font-[family-name:var(--font-raleway)] text-[10px] font-semibold tracking-[0.2em] uppercase text-cream/40 mb-3">
        Recipients
      </h3>

      {/* To */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="brief-to"
            className="font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.16em] uppercase text-cream/60"
          >
            To
          </label>
          <button
            type="button"
            onClick={() => {
              const next = toMode === "saved" ? "custom" : "saved";
              setToMode(next);
              if (next === "custom") setTo("");
              else if (savedRecipients[0]) setTo(savedRecipients[0].email);
            }}
            className="font-[family-name:var(--font-raleway)] text-[10px] tracking-[0.16em] uppercase text-gold hover:text-gold-ink transition-colors cursor-pointer"
          >
            {toMode === "saved" ? "Type custom" : "Pick from saved"}
          </button>
        </div>
        {toMode === "saved" && savedRecipients.length > 0 ? (
          <select
            id="brief-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full bg-charcoal text-cream border border-cream/15 px-3 py-2 font-[family-name:var(--font-raleway)] text-sm focus:outline-none focus:border-gold min-h-[44px]"
          >
            {!savedEmailSet.has(to.trim().toLowerCase()) && to && (
              <option value={to}>{to}</option>
            )}
            {savedRecipients.map((r) => (
              <option key={r.id} value={r.email}>
                {r.label} — {r.email}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="brief-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="someone@example.com"
            className="w-full bg-charcoal text-cream border border-cream/15 px-3 py-2 font-[family-name:var(--font-raleway)] text-sm focus:outline-none focus:border-gold min-h-[44px]"
          />
        )}
      </div>

      {/* CC */}
      <div>
        <label
          htmlFor="brief-cc"
          className="block font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.16em] uppercase text-cream/60 mb-1.5"
        >
          CC
        </label>
        {cc.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {cc.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-cream/10 text-cream/90 font-[family-name:var(--font-raleway)] text-xs"
              >
                {email}
                <button
                  type="button"
                  onClick={() => removeCc(email)}
                  aria-label={`Remove ${email}`}
                  className="text-cream/50 hover:text-cream transition-colors cursor-pointer"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M2 2l6 6M8 2l-6 6" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            id="brief-cc"
            type="email"
            value={ccDraft}
            onChange={(e) => {
              setCcDraft(e.target.value);
              setCcError(null);
            }}
            onKeyDown={handleCcKey}
            placeholder="Add ad-hoc email and press Enter"
            className="flex-1 bg-charcoal text-cream border border-cream/15 px-3 py-2 font-[family-name:var(--font-raleway)] text-sm focus:outline-none focus:border-gold min-h-[44px]"
          />
          <button
            type="button"
            onClick={() => addCc(ccDraft)}
            disabled={!ccDraft.trim()}
            className="px-3 py-2 border border-cream/20 text-cream/80 font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.16em] uppercase hover:border-gold hover:text-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] cursor-pointer"
          >
            Add
          </button>
        </div>
        {ccError && (
          <p className="mt-1.5 font-[family-name:var(--font-raleway)] text-xs text-error">
            {ccError}
          </p>
        )}
        {availableForCc.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="font-[family-name:var(--font-raleway)] text-[10px] tracking-[0.16em] uppercase text-cream/40 mr-1 self-center">
              Add saved:
            </span>
            {availableForCc.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => addCc(r.email)}
                className="px-2 py-1 border border-cream/15 text-cream/70 font-[family-name:var(--font-raleway)] text-xs hover:border-gold hover:text-gold transition-colors cursor-pointer"
              >
                + {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
