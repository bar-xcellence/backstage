"use client";

import { useState } from "react";
import { sendMagicLink } from "@/actions/auth";

export default function SignInPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    const result = await sendMagicLink(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    }
    if (result.success) {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-12">
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light text-cream tracking-tight">
            Backstage
          </h1>
          <p className="font-[family-name:var(--font-raleway)] text-[10px] font-medium tracking-[0.18em] uppercase text-grey mt-2">
            Bar Excellence Events
          </p>
        </div>

        {sent ? (
          /* Email sent confirmation */
          <div className="bg-cream p-8">
            <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal mb-3 tracking-tight">
              Check your email
            </h2>
            <p className="font-[family-name:var(--font-raleway)] text-sm text-gold-ink leading-relaxed">
              A sign-in link has been sent. The link expires in 15 minutes.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setError("");
              }}
              className="mt-6 text-gold text-[11px] font-semibold tracking-[0.16em] uppercase hover:text-gold-ink transition-colors duration-200"
            >
              TRY ANOTHER EMAIL
            </button>
          </div>
        ) : (
          /* Login form */
          <form action={handleSubmit} className="bg-cream p-8">
            <label
              htmlFor="email"
              className="block font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mb-2"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              className="w-full px-4 py-3 bg-transparent border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:border-gold focus:outline-none transition-colors duration-200 placeholder:text-grey/50"
              placeholder="murdo@bar-excellence.app"
            />

            {error && (
              <p className="mt-3 text-error text-sm font-[family-name:var(--font-raleway)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 py-3 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {loading ? "SENDING..." : "SIGN IN"}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-grey/40 text-[10px] font-[family-name:var(--font-raleway)] tracking-[0.16em] uppercase mt-8">
          Backstage v1.0
        </p>
      </div>
    </div>
  );
}
