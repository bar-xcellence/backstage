"use client";

import { useState, useTransition } from "react";
import { setAppSetting } from "@/actions/app-settings";
import { FROM_EMAIL_SETTING_KEY } from "@/lib/lc-email";

export function FromAddressSection({
  currentValue,
  envFallback,
}: {
  currentValue: string | null;
  envFallback: string | null;
}) {
  const [value, setValue] = useState(currentValue ?? "");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const res = await setAppSetting(FROM_EMAIL_SETTING_KEY, value);
      if (res.error) {
        setStatus({ type: "error", message: res.error });
      } else {
        setStatus({
          type: "success",
          message: value.trim()
            ? "From address updated"
            : "From address cleared — falling back to env",
        });
      }
    });
  }

  const effective = value.trim() || envFallback || "(none — sends will fail)";

  return (
    <section className="mb-12">
      <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-charcoal tracking-tight mb-1">
        From address
      </h2>
      <p className="font-[family-name:var(--font-raleway)] text-sm text-grey mb-4">
        The sender shown on briefs, magic-link sign-in emails, and lead-time
        alerts. Must be on a domain verified in Resend, or sends will be
        rejected.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="block font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase text-grey mb-1.5">
            From email
          </span>
          <input
            type="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={envFallback ?? "no-reply@bar-excellence.app"}
            className="w-full bg-cream border border-charcoal/15 px-3 py-2.5 font-[family-name:var(--font-raleway)] text-sm text-charcoal focus:outline-none focus:border-gold min-h-[44px]"
          />
        </label>

        <p className="font-[family-name:var(--font-raleway)] text-xs text-grey">
          Effective: <span className="text-charcoal">{effective}</span>
          {envFallback && !value.trim() && (
            <span className="ml-2 text-[10px] tracking-[0.16em] uppercase text-gold">
              ENV FALLBACK
            </span>
          )}
        </p>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="px-6 py-2.5 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
          >
            {pending ? "SAVING..." : "SAVE"}
          </button>
          {status && (
            <span
              className={`font-[family-name:var(--font-raleway)] text-sm ${
                status.type === "success" ? "text-success" : "text-error"
              }`}
            >
              {status.message}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
