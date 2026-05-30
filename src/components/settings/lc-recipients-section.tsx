"use client";

import { useState, useTransition } from "react";
import {
  createLcRecipient,
  updateLcRecipient,
  deleteLcRecipient,
  setDefaultToRecipient,
} from "@/actions/lc-recipients";

export interface RecipientRow {
  id: string;
  label: string;
  email: string;
  isDefaultTo: boolean;
  isAutoCc: boolean;
  isActive: boolean;
}

export function LcRecipientsSection({
  recipients,
}: {
  recipients: RecipientRow[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSetDefault(id: string) {
    setError(null);
    startTransition(async () => {
      await setDefaultToRecipient(id);
    });
  }

  function handleDelete(id: string, label: string) {
    if (!confirm(`Delete "${label}" from saved recipients?`)) return;
    setError(null);
    startTransition(async () => {
      await deleteLcRecipient(id);
    });
  }

  return (
    <section>
      <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-charcoal tracking-tight mb-1">
        Saved LC recipients
      </h2>
      <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mb-4">
        Picks from this list appear in the Send to LC picker. Mark one as the
        default To and any number as Auto-CC (added to every send).
      </p>

      {error && (
        <div className="bg-error/10 border border-error/20 p-3 mb-4">
          <p className="font-[family-name:var(--font-raleway)] text-sm text-error">
            {error}
          </p>
        </div>
      )}

      <div className="border border-charcoal/10">
        {recipients.length === 0 && !adding && (
          <div className="px-4 py-8 text-center">
            <h3 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-charcoal mb-1">
              No recipients yet
            </h3>
            <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mb-4">
              Add at least one so Send to LC has a default address to use.
            </p>
            <button
              onClick={() => setAdding(true)}
              className="px-5 py-2.5 bg-gold-ink text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold transition-colors duration-200 min-h-[44px] cursor-pointer"
            >
              ADD FIRST RECIPIENT
            </button>
          </div>
        )}

        {recipients.map((r) =>
          editingId === r.id ? (
            <RecipientEditRow
              key={r.id}
              recipient={r}
              onDone={() => {
                setEditingId(null);
                setError(null);
              }}
              onError={setError}
            />
          ) : (
            <div
              key={r.id}
              className="flex items-center justify-between gap-4 px-4 py-3 border-b border-charcoal/10 last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-[family-name:var(--font-raleway)] text-sm font-medium text-charcoal">
                    {r.label}
                  </span>
                  {r.isDefaultTo && (
                    <span className="font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.16em] uppercase text-gold-ink border border-gold/40 px-1.5 py-0.5">
                      Default To
                    </span>
                  )}
                  {r.isAutoCc && (
                    <span className="font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.16em] uppercase text-charcoal/60 border border-charcoal/20 px-1.5 py-0.5">
                      Auto-CC
                    </span>
                  )}
                  {!r.isActive && (
                    <span className="font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.16em] uppercase text-grey">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="font-[family-name:var(--font-raleway)] text-xs text-grey mt-0.5 truncate">
                  {r.email}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!r.isDefaultTo && r.isActive && (
                  <button
                    onClick={() => handleSetDefault(r.id)}
                    disabled={pending}
                    className="font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.16em] uppercase text-charcoal hover:text-gold transition-colors disabled:opacity-50 min-h-[44px] px-2 cursor-pointer"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => setEditingId(r.id)}
                  className="font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.16em] uppercase text-charcoal hover:text-gold transition-colors min-h-[44px] px-2 cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id, r.label)}
                  disabled={pending}
                  className="font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.16em] uppercase text-error hover:opacity-70 transition-opacity disabled:opacity-50 min-h-[44px] px-2 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}

        {adding && (
          <RecipientAddRow
            existingHasDefault={recipients.some((r) => r.isDefaultTo)}
            onDone={() => {
              setAdding(false);
              setError(null);
            }}
            onError={setError}
          />
        )}
      </div>

      {!adding && recipients.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setAdding(true)}
            className="px-5 py-2.5 border border-gold/50 text-gold-ink font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold/10 transition-colors duration-200 min-h-[44px] cursor-pointer"
          >
            + ADD RECIPIENT
          </button>
        </div>
      )}
    </section>
  );
}

function RecipientAddRow({
  existingHasDefault,
  onDone,
  onError,
}: {
  existingHasDefault: boolean;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [isAutoCc, setIsAutoCc] = useState(false);
  const [isDefaultTo, setIsDefaultTo] = useState(!existingHasDefault);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await createLcRecipient({
        label,
        email,
        isAutoCc,
        isDefaultTo,
      });
      if (res.errors) {
        onError(res.errors.join(". "));
      } else {
        onDone();
      }
    });
  }

  return (
    <div className="px-4 py-4 bg-cream-warm/30 border-b border-charcoal/10 last:border-b-0">
      <RecipientFields
        label={label}
        email={email}
        isAutoCc={isAutoCc}
        isDefaultTo={isDefaultTo}
        showDefaultToggle
        onLabel={setLabel}
        onEmail={setEmail}
        onAutoCc={setIsAutoCc}
        onDefaultTo={setIsDefaultTo}
      />
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-5 py-2 bg-gold-ink text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
        >
          {pending ? "SAVING..." : "SAVE"}
        </button>
        <button
          onClick={onDone}
          disabled={pending}
          className="px-5 py-2 border border-charcoal/20 text-charcoal font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-charcoal/5 transition-colors duration-200 min-h-[44px] cursor-pointer"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

function RecipientEditRow({
  recipient,
  onDone,
  onError,
}: {
  recipient: RecipientRow;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [label, setLabel] = useState(recipient.label);
  const [email, setEmail] = useState(recipient.email);
  const [isAutoCc, setIsAutoCc] = useState(recipient.isAutoCc);
  const [isActive, setIsActive] = useState(recipient.isActive);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await updateLcRecipient(recipient.id, {
        label,
        email,
        isAutoCc,
        isActive,
      });
      if (res.errors) {
        onError(res.errors.join(". "));
      } else {
        onDone();
      }
    });
  }

  return (
    <div className="px-4 py-4 bg-cream-warm/30 border-b border-charcoal/10 last:border-b-0">
      <RecipientFields
        label={label}
        email={email}
        isAutoCc={isAutoCc}
        isActive={isActive}
        showActiveToggle
        onLabel={setLabel}
        onEmail={setEmail}
        onAutoCc={setIsAutoCc}
        onActive={setIsActive}
      />
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-5 py-2 bg-gold-ink text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
        >
          {pending ? "SAVING..." : "SAVE"}
        </button>
        <button
          onClick={onDone}
          disabled={pending}
          className="px-5 py-2 border border-charcoal/20 text-charcoal font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-charcoal/5 transition-colors duration-200 min-h-[44px] cursor-pointer"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

function RecipientFields({
  label,
  email,
  isAutoCc,
  isDefaultTo,
  isActive,
  showDefaultToggle,
  showActiveToggle,
  onLabel,
  onEmail,
  onAutoCc,
  onDefaultTo,
  onActive,
}: {
  label: string;
  email: string;
  isAutoCc: boolean;
  isDefaultTo?: boolean;
  isActive?: boolean;
  showDefaultToggle?: boolean;
  showActiveToggle?: boolean;
  onLabel: (v: string) => void;
  onEmail: (v: string) => void;
  onAutoCc: (v: boolean) => void;
  onDefaultTo?: (v: boolean) => void;
  onActive?: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="block">
        <span className="block font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.16em] uppercase text-grey mb-1">
          Label
        </span>
        <input
          type="text"
          value={label}
          onChange={(e) => onLabel(e.target.value)}
          placeholder="Rory · LC"
          className="w-full bg-cream border border-charcoal/15 px-3 py-2 font-[family-name:var(--font-raleway)] text-sm text-charcoal focus:outline-none focus:border-gold min-h-[44px]"
        />
      </label>
      <label className="block">
        <span className="block font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.16em] uppercase text-grey mb-1">
          Email
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          placeholder="rory@lc-group.com"
          className="w-full bg-cream border border-charcoal/15 px-3 py-2 font-[family-name:var(--font-raleway)] text-sm text-charcoal focus:outline-none focus:border-gold min-h-[44px]"
        />
      </label>
      <div className="md:col-span-2 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={isAutoCc}
            onChange={(e) => onAutoCc(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="font-[family-name:var(--font-raleway)] text-sm text-charcoal">
            Auto-CC on every send
          </span>
        </label>
        {showDefaultToggle && onDefaultTo && (
          <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={isDefaultTo ?? false}
              onChange={(e) => onDefaultTo(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="font-[family-name:var(--font-raleway)] text-sm text-charcoal">
              Use as Default To
            </span>
          </label>
        )}
        {showActiveToggle && onActive && (
          <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={isActive ?? true}
              onChange={(e) => onActive(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="font-[family-name:var(--font-raleway)] text-sm text-charcoal">
              Active
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
