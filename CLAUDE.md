# Backstage — Claude Context

Bar Excellence's events preparation and dispatch system. Bespoke tool for 3 users: Murdo (owner), Rob (super_admin), Rory at LC (partner, read-only).

## Quick Reference

- **Stack:** Next.js 16.2 App Router, React 19, TypeScript 5, Tailwind v4, Drizzle ORM, NeonDB, Resend, Vitest, Playwright
- **Design system:** Reserve Noir — see `stitch_backstage_events_dashboard/reserve_noir/DESIGN.md`
- **Auth:** Custom magic link (Resend + iron-session), NOT Auth.js. See `src/lib/session.ts`
- **Role check:** Always use `requireRole()` from `src/lib/session.ts` in every server action
- **Schema:** `src/db/schema.ts` — single source of truth for all tables
- **Tests:** `npm run test -- --run` (Vitest, `src/**/*.test.ts`); `npm run test:e2e` (Playwright, `e2e/*.spec.ts` — boots `next start -p 3100` with `ENABLE_TEST_AUTH=true`)
- **Build:** `npm run build` (must pass before shipping)

## Intent Layer

**Before modifying code in a subdirectory, read its `AGENTS.md` first** for local patterns and invariants.

- **`src/lib/AGENTS.md`** — business logic & the partner-isolation security core (sanitisation, projection, dashboard filters, email/PDF, calculators). The most dangerous place to get wrong.
- **`src/components/AGENTS.md`** — React UI by surface (dashboard/events/layout/settings), client/server boundary, Reserve Noir rules.

### Global Invariants

- `requireRole()` from `src/lib/session.ts` is the first line of every server action in `src/actions/`.
- `src/db/schema.ts` is the single source of truth; every `events` column must be classified in `src/lib/partner-event-projection.ts` (the pinned test fails otherwise).
- Partner isolation has one sanitiser path (`stripPartnerEvent()`) plus `!isPartner` UI gating as defence-in-depth — keep both.
- The brief renders on four surfaces that must stay in sync — see `src/lib/AGENTS.md`.

## Project Docs

| Doc | Purpose |
|---|---|
| `docs/plans/` | Implementation plans per phase — read before building |
| `TODOS.md` | Outstanding tasks and design debt |
| `stitch_backstage_events_dashboard/reserve_noir/DESIGN.md` | Reserve Noir design tokens, rules, components |
| `docs/design-doc.md` | Approved design document with architecture decisions |

## Conventions

### Code Style
- Server actions live in `src/actions/` — always `"use server"` at top, always `requireRole()` first
- Client components live in `src/components/` — always `"use client"` at top
- Revalidate paths after mutations: `revalidatePath("/events")` etc.
- No `border-radius` — Reserve Noir enforces 0px globally via `globals.css`
- Typography: `font-[family-name:var(--font-cormorant)]` for headings, `font-[family-name:var(--font-raleway)]` for body
- Utility labels: `text-[11px] font-medium tracking-[0.16em] uppercase`
- Touch targets: minimum 44px height on all interactive elements
- Colours: use Tailwind tokens (`text-gold`, `bg-charcoal`, `text-cream`, etc.) defined in `globals.css`

### Multi-line address (Spec G)
`events` gains 6 optional address fields: `addressLine1`, `addressLine2`, `city`, `postcode`, `venueTenant`, `cateringPartner`. `venueName` stays required but now holds the short brand only (e.g. "Aurora", not "Aurora @ Pinsent Masons, 120 Bothwell Street...").

A shared `formatAddressLines()` helper in `src/lib/address-format.ts` composes the structured fields into ordered lines: venueName → `@ tenant` → `catered by partner` → venueHallRoom → line 1 → line 2 → `city, postcode`. Empty fields drop out automatically.

Used by: event detail Location section, summary bar (`city` chip), brief preview, email (multi-line Location section), both PDFs. Form (`event-form.tsx`) captures all 6 new fields; create + update actions persist them.

Seed splits Heathrow and Glasgow addresses into structured fields and drops the `WORKAROUND[address]` comments.

### Batching instructions (Spec E)
`events.batchingInstructions` was previously read only by `brief-preview.tsx`. Now surfaced on:
- Event detail Overview (Batching section above Pop-up Bar)
- Brief email (Batching section between Times and Site Contacts)
- Both PDFs

Glasgow seed moved pre-pour text from `notesCustom` (where it carried a `WORKAROUND[pre-pour-batching]:` marker) into `batchingInstructions`. No schema change — Option A.

### Pop-up bar (Spec D)
When `events.popUpBar` is true, `popUpBarSize` (e.g. "3m curved") and `popUpBarBranding` (e.g. "Vinyl banner front branding...") are surfaced on:
- Event detail summary bar (`page.tsx` — `Pop-up bar · 3m curved`)
- Event detail Pop-up Bar section (Size + Branding labels)
- Brief preview, email ("Branding: ..." line under What), both PDFs
- `popUpBarSupplier` remains for actual supplier name (not branding text)

### Host visibility (Spec C)
`eventContacts.isHost: boolean` flags the on-site lead (max one per event by convention — no DB constraint, enforced by seed/admin discipline). Surfaced as a prominent "Host: <name>" badge above the rest of the contact list on:
- Event detail page (`app/(authenticated)/events/[id]/page.tsx` — gold-underlined block)
- Brief preview (`components/events/brief-preview.tsx` — gold text)
- Brief email (`lib/brief-email-template.ts` — bold "Host:" prefix above contacts)
- Both PDFs (`lib/pdf/brief-pdf.tsx`, `lib/pdf/text-only-brief-pdf.tsx`)

### Settings + saved LC recipients (Spec J)
New `/settings` route (owner + super_admin only — partner is redirected to `/events`). Two sections, backed by two new tables.

**`lc_recipients`** — managed list of named send targets:
- `label` (e.g. "Rory · LC"), `email`, `isDefaultTo` (one row at a time), `isAutoCc` (any number), `isActive`
- Invariant "at most one `isDefaultTo`" enforced by `setDefaultToRecipient()` in `src/actions/lc-recipients.ts` (no DB constraint — neon-http has no transactions, so it's a two-step UPDATE)
- Read by `brief-preview.ts` to populate the picker; new event create (`actions/events.ts`) pre-fills `events.lcRecipient` with the current default's email

**`app_settings`** — generic key/value (currently only `from_email`):
- `getFromEmail()` in `src/lib/lc-email.ts` is now `async` — reads DB first, falls back to `process.env.FROM_EMAIL`
- All outbound senders go through it: `send-to-lc.ts`, `auth.ts` (magic links), `alerts.ts`
- Empty/cleared setting → env fallback applies (preserves dev workflow)

**At-send picker** lives inside the existing `BriefPreview` slide-over (`components/events/brief-preview.tsx`), rendered by `recipients-panel.tsx`:
- To: dropdown of saved recipients OR "Type custom" mode for ad-hoc emails
- CC: tag-style multi-select pre-filled with `isAutoCc` recipients, plus an Enter-to-add ad-hoc input
- Picker state passed to `sendToLC(eventId, { to, cc[] })` — validated server-side by `resolveSendRecipients()` (dedupes, validates each email)
- Re-send confirmation flow remembers the last picked recipients (`SendToLCButton` keeps them in state)

Seed inserts one row: `Rory · LC` (`rory@lc-group.com`, default To, no auto-CC). If `FROM_EMAIL` is set in env at seed time, it's copied into `app_settings.from_email`. Legacy events that still store `"Rory"` as `lcRecipient` continue to resolve via `resolveLCEmail()`.

### Dashboard (Spec K — partner + owner unified)
`/` is the single landing route for all roles. Role-aware shell renders:
- Partner: month-of-cards view from PRD §5 (no KPI strip, no actions queue). Cards are non-interactive, show only `lcPayout`, `commissionNote`, `elementsSummary`, plus the partner-visible base fields.
- Owner + super_admin: existing KPI strip + actions queue (unchanged) above the new month header + summary strip + cards. Owner cards add a footer panel with Invoice / Cost / Margin / Payout, brief sent status, checklist progress, and a T-N days countdown. Whole card is a link to `/events/{id}`.
- `?viewAs=partner` is honoured for owner/super_admin only — shows a sticky gold-bordered banner. Partner sees no banner.
- Filter state lives in URL (`?month=YYYY-MM&statuses=confirmed,enquiry`). Last-chip-deselect resists with a pulse.
- Empty states: globally empty + partner → warm welcome ("Briefs will appear here once Murdo confirms…"); globally empty + owner → existing `DashboardClient` zero-state with "Create event" CTA; filter empty → "No events in this window." Both roles avoid double-empty rendering by gating the month section on `globalEventCount > 0`.

Pinned classification: every column on `events` is classified into `PARTNER_VISIBLE_DB_FIELDS`, `PARTNER_STRIPPED_FIELDS`, or `OWNER_ONLY_FIELDS` in `src/lib/partner-event-projection.ts`. Adding a new column without classifying it fails `partner-event-projection.test.ts`.

Status mapping: `toPartnerStatus()` in `src/lib/dashboard-status.ts` collapses the 6-state db enum to the 4-state display set (`provisional`/`confirmed`/`delivered`/`cancelled`). The db enum is unchanged. The mapping is applied **at the projection boundary** in `projectPartnerEvent()` — `PartnerEventCard.status: DisplayStatus`, so raw db statuses like `enquiry`/`preparation`/`ready` never reach the partner client payload.

Partner summary isolation: `toPartnerSummary()` in `src/lib/dashboard-summary.ts` narrows `SummaryTotals` to `PartnerSummary` (`eventCount`/`confirmedTotal`/`provisionalTotal` only). `getDashboardEvents` applies it in the partner branch so `invoicedDeliveredTotal` and `briefUnsentCount` (owner workflow signals) never appear in the partner response payload.

Three new fields on `events`: `lcPayout` (numeric), `commissionNote` (text), `elementsSummary` (text). All optional. Form has all three in the Financial section.

### Per-cocktail ice / straw / reference image (Spec H)
`cocktails.iceType`, `iceAmountG`, `straw`, `strawType`, `referenceImageUrl` are surfaced on all 4 brief surfaces and the cocktails tab:
- `brief-preview.tsx` — ice/straw lines + `<img>` reference
- `brief-email-template.ts` — ice/straw lines + `<img>` reference
- `lib/pdf/brief-pdf.tsx` — ice/straw lines + react-pdf `<Image>` (120×120)
- `lib/pdf/text-only-brief-pdf.tsx` — ice/straw lines (no image)
- `components/events/cocktail-selector.tsx` — pill badges + reference image

Brief-surface call sites already enrich `ec.cocktail` (`send-to-lc.ts`, `api/events/[id]/pdf/route.ts`, `actions/brief-preview.ts`); no schema changes needed.

### Equipment + overview on the brief
The brief (Download PDF + Send to LC email + in-app preview) previously omitted the event's **equipment** entirely and rendered a thinner "What" than the email. Both are now on all four brief surfaces (`brief-email-template.ts`, `pdf/brief-pdf.tsx`, `pdf/text-only-brief-pdf.tsx`, `components/events/brief-preview.tsx`):
- **Equipment** — the `eventEquipment` rows (itemName × quantity) render as their own section after the stock sections. Fetched at the three brief call sites: PDF route (inline `db.select` matching its direct-query style), `send-to-lc.ts` and `brief-preview.ts` (via `getEventEquipment()`). `buildBriefEmailHtml` gained an optional 6th param `equipment = []`; `BriefPDF`/`TextOnlyBriefPDF` gained a required `equipment` prop; `BriefPreviewData` gained `equipment`.
- **Overview parity** — eventType / serviceType / `flairRequired` / `dryIce` are now in the "What" section of both PDFs and the preview (the email already had them). In the partner-accessible PDF route these come from `stripPartnerEvent(event)`, so the owner-only ones (`serviceType`/`flairRequired`/`dryIce`) null out and the guards render nothing — no partner leak. Equipment is intentionally partner-visible (already shown unconditionally on the event detail Equipment tab; `getEventEquipment()` allows the partner role) and is a separate table, so it is not part of the `partner-event-projection.ts` classification.

Cocktails and the stock list were already wired and render when populated — they appear empty only when an event has zero cocktails (stock derives from cocktails).

### Deleting events (owner)
Owner/super_admin can permanently delete an event (e.g. a duplicate enquiry). `deleteEvent(id)` in `src/actions/events.ts` `db.delete`s the row; the six child tables (contacts, cocktails, equipment, standard notes, stock, checklist) all `onDelete: "cascade"`, so no orphans and no transaction needed. The deletion policy is the pure `canDeleteEvent(status)` / `deleteBlockedReason(status)` in `src/lib/event-deletion.ts` (TDD'd): deletable for every status **except `completed`** (completed events are protected finished records on `/completed`). Both the action guard and the UI gate use `canDeleteEvent` — single source of truth. `DeleteEventButton` (`components/events/delete-event-button.tsx`) is a client confirm-modal rendered in the event-detail header inside the `!isPartner` block; on success it redirects to `/events`. Partners never see it and the action is owner-gated. Spec: `docs/superpowers/specs/2026-06-17-delete-event-design.md`.

### Recipe editor (owner CRUD)
Owner/super_admin manage the cocktail library in-app (partner stays read-only):
- Routes: `/recipes/new`, `/recipes/[id]/edit` (role-gated via `getSession()`; partner redirected to `/recipes`)
- Actions in `src/actions/recipes.ts`: `createRecipe`, `updateRecipe` (replaces child rows — neon-http has no transactions), `archiveRecipe` (soft delete `isActive=false`, guards on existence), `duplicateRecipe` ("Copy of …", clones children via the shared `insertChildren` helper)
- Validation: `src/lib/recipe-validation.ts` (`validateRecipeInput`, TDD) — also validates ingredient/garnish categories + units against their enums before the actions cast to DB enums
- Reference images upload to UploadThing via `/api/uploadthing` endpoint `recipeImage` (role-gated); needs `UPLOADTHING_TOKEN`
- Archived recipes drop out of `listRecipes` and `getAvailableCocktails` (both filter `isActive=true`); historical events keep their cocktail rows
- Components: `recipe-form.tsx` (dynamic ingredient/garnish rows, per-ingredient optional checkbox, `aria-label`/`htmlFor` for axe), `image-uploader.tsx`, `recipe-actions.tsx`
- Spec/plan: `docs/superpowers/specs/2026-05-31-recipe-editor-design.md`, `docs/superpowers/plans/2026-05-31-recipe-editor.md`

### Equipment scaling rules
`scalingRuleEnum` (in `src/db/schema.ts`) drives per-template-item scaling via `scaleEquipment()` (`src/lib/equipment-scaler.ts`):
- `per_station` — multiplied by `stationCount`
- `per_spirit` — multiplied by distinct spirit count
- `per_ingredient` — multiplied by distinct ingredient count
- `per_guest` — multiplied by `guestCount` (e.g. 130 rocks glasses for 130 guests)
- `fixed` — no multiplication

Callers must pass `{ stationCount, spiritCount, ingredientCount, guestCount }`. `applyTemplate()` (`src/actions/equipment.ts`) takes guestCount as a 6th positional arg.

### Empty States
Never show "No items found." — every empty state needs:
1. Warm heading (Cormorant Garamond)
2. Contextual body text explaining what will appear here (Raleway)
3. Gold CTA where a clear next action exists
4. Hide sections entirely when "nothing to show" is correct (don't say "Nothing here!")

### Role Security
- Partner (Rory) must NEVER see the five forbidden financial fields (`invoiceAmount`, `costAmount`, `stockReturnPolicy`, `cardPaymentPrice`, `cardPaymentCommission`) OR any column in `OWNER_ONLY_FIELDS` in `src/lib/partner-event-projection.ts` (lcSentAt, prepaidServes, stationCount, popUpBar*, batchingInstructions, staffNames, vehicleReg, lcRecipient, notesCustom, outcomeNotes, arriveTime/setupDeadline/service times, etc.).
- Single sanitiser source of truth: `stripPartnerEvent()` in `src/lib/partner-event-sanitisation.ts`, applied by `getEvent()`, `listEvents()`, and the PDF route. Adding a column to `OWNER_ONLY_FIELDS` automatically extends the strip; the pinned classification test in `partner-event-projection.test.ts` fails until a new column is classified.
- Partner sees confirmed+ events only — server-enforced by `allowedStatusesForRole("partner")` in `src/lib/dashboard-filters.ts` returning `["confirmed", "preparation", "ready", "delivered"]`. `parseFilters()` clamps URL `?statuses=` against this allow-list; `getDashboardEvents()` re-intersects defence-in-depth before the SQL query, and `globalEventCount` is restricted to the same envelope so partners cannot infer existence of out-of-envelope events.
- Event detail page (`/events/[id]`): partners see the collapsed `toPartnerStatus()` label, never the raw DB status. Owner-only operational sections (Times, Batching, Pop-up Bar, Install Instructions, Notes, plus summary-bar pills for serves/stations/lcSentAt/showName) are gated on `!isPartner` — defence-in-depth on top of the server-side strip.
- Partner has no access to: event creation, event editing, Send to LC, status changes. Partner lands on the unified dashboard at `/`.

### Testing
- TDD: write the failing test first, then implement
- Business logic tests in `src/lib/*.test.ts`
- Schema tests in `src/db/schema.test.ts`
- Test command: `npm run test -- --run`

### Git
- Commit after each logical unit of work
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- Don't batch unrelated changes

## Mistakes Log

<!-- 
Add entries here when a bug is found during implementation.
Format: YYYY-MM-DD | What went wrong | Root cause | Fix applied
This helps future sessions avoid repeating the same mistakes.
-->

| Date | Issue | Root cause | Fix |
|---|---|---|---|
| 2026-04-16 | Session object not serialisable for Client Components | iron-session returns a class instance, not a plain object | Spread session to plain object in `app-shell.tsx` before passing as prop |
| 2026-04-16 | Magic link emails not delivering | Missing error logging in Resend call | Added try/catch with console.error in auth action |
| 2026-04-16 | `middleware.ts` not recognised by Next.js 16.2 | Next.js 16.2 renamed middleware convention to `proxy.ts` | Renamed file to `src/proxy.ts` |
| 2026-04-16 | Checklist toggle/remove didn't verify item ownership | `itemId` fetched without checking `eventId` match | Added `item.eventId !== eventId` guard in both actions |
| 2026-04-16 | `updateEventStatus` accepted arbitrary strings | `as` cast bypassed TypeScript; DB would reject but no app-level check | Added `VALID_STATUSES` allowlist check before DB call |
| 2026-04-16 | Dashboard revenue counted all events, not just delivered | Filter missed `status === "delivered"` condition | Added delivered-only filter to revenue calculation |
| 2026-04-16 | `"use server"` file exposed `checkAndSendAlerts` as callable action | Every export in a `"use server"` file becomes a server action | Removed `"use server"` directive — file is only imported by `dashboard.ts` |
| 2026-04-16 | `STATUS_ORDER` with `as const` broke `indexOf(event.status)` | Readonly tuple `.indexOf()` expects literal union, not `string` | Removed `as const` — DB status comes as plain `string` |
