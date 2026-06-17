# src/lib — Business Logic & Security Core

## Purpose
Pure, testable business logic: auth/session, the partner-isolation security layer, dashboard
filtering/projection, email/PDF composition, and domain calculators (stock, equipment scaling,
countdowns). No React, no `"use server"`. Server actions in `../actions/` and route handlers
call into here — this is where the rules live, so it is the most dangerous place to get wrong.

## Entry Points
- `session.ts` — `getSession()`, `createSession()`, `destroySession()`, **`requireRole()`** (the auth gate every server action calls first)
- `partner-event-sanitisation.ts` — `stripPartnerEvent()` / `stripPartnerFinancials()` — the single sanitiser source of truth
- `partner-event-projection.ts` — the pinned field classification + `projectPartnerEvent()`
- `dashboard-filters.ts` — `allowedStatusesForRole()`, `parseFilters()`, `resolveEffectiveRole()`, `monthBounds()`
- `dashboard-status.ts` / `dashboard-summary.ts` — `toPartnerStatus()` (6→4 enum collapse), `toPartnerSummary()`
- `lc-email.ts` — async `getFromEmail()` (DB-first, env fallback), `resolveLCEmail()`
- `brief-email-template.ts`, `pdf/` — the brief surfaces (must stay in sync — see Anti-patterns)
- `equipment-scaler.ts`, `stock-calculator.ts`, `address-format.ts`, `event-countdown.ts` — domain calculators

## Contracts & Invariants
- **Partner must NEVER see** the five forbidden financial fields (`invoiceAmount`, `costAmount`,
  `stockReturnPolicy`, `cardPaymentPrice`, `cardPaymentCommission`) **or** anything in `OWNER_ONLY_FIELDS`.
- **Every `events` column is classified** into exactly one of `PARTNER_VISIBLE_DB_FIELDS`,
  `PARTNER_STRIPPED_FIELDS`, or `OWNER_ONLY_FIELDS` in `partner-event-projection.ts`. Adding a
  column without classifying it **fails `partner-event-projection.test.ts`** — this is the tripwire.
- **One sanitiser, one path:** all partner-facing event reads go through `stripPartnerEvent()`.
  Don't write a second stripping function — extend `OWNER_ONLY_FIELDS` and the strip follows.
- **Status collapse happens at the projection boundary:** raw DB statuses (`enquiry`/`preparation`/`ready`)
  must never reach a partner payload. `projectPartnerEvent()` applies `toPartnerStatus()` so
  `PartnerEventCard.status` is already a 4-state `DisplayStatus`.
- **Partner status envelope is server-enforced:** `allowedStatusesForRole("partner")` returns
  `["confirmed","preparation","ready","delivered"]`; `parseFilters()` clamps URL `?statuses=` against it,
  and callers re-intersect defence-in-depth before the SQL query (incl. `globalEventCount`).
- **`getFromEmail()` is async** (reads `app_settings` first, falls back to `process.env.FROM_EMAIL`).
  Empty/cleared setting → env fallback. All outbound senders go through it.
- **`lcRecipient` "at most one default"** is enforced in code (two-step UPDATE), not the DB —
  neon-http has no transactions.

## Patterns
Adding a new `events` column:
1. Add to `schema.ts` (`../db/`).
2. Classify it in `partner-event-projection.ts` (visible / stripped / owner-only) — the test forces this.
3. If owner-only, you're done for isolation — `stripPartnerEvent()` covers it automatically.

Surfacing a new field on the brief: update **all four** brief surfaces (see Anti-patterns) plus the
event detail page, then their tests.

## Anti-patterns
- **Never partially update the brief surfaces.** A field shown on the brief must appear on all four:
  `brief-email-template.ts`, `pdf/brief-pdf.tsx`, `pdf/text-only-brief-pdf.tsx`, and
  `../components/events/brief-preview.tsx`. Drift here ships a wrong brief to the client.
- Don't read `process.env.FROM_EMAIL` directly — call `getFromEmail()`.
- Don't hand-filter partner statuses inline — use `allowedStatusesForRole()`.
- Don't add a `"use server"` directive here — every export would become a callable action (see Mistakes Log).

## Related Context
- Schema source of truth: `../db/schema.ts`
- Server actions that call this layer: `../actions/`
- Root rules & full field lists: `../../CLAUDE.md` (Role Security, Dashboard Spec K)
