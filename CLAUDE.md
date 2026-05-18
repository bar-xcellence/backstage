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

### Per-cocktail ice / straw / reference image (Spec H)
`cocktails.iceType`, `iceAmountG`, `straw`, `strawType`, `referenceImageUrl` are surfaced on all 4 brief surfaces and the cocktails tab:
- `brief-preview.tsx` — ice/straw lines + `<img>` reference
- `brief-email-template.ts` — ice/straw lines + `<img>` reference
- `lib/pdf/brief-pdf.tsx` — ice/straw lines + react-pdf `<Image>` (120×120)
- `lib/pdf/text-only-brief-pdf.tsx` — ice/straw lines (no image)
- `components/events/cocktail-selector.tsx` — pill badges + reference image

Brief-surface call sites already enrich `ec.cocktail` (`send-to-lc.ts`, `api/events/[id]/pdf/route.ts`, `actions/brief-preview.ts`); no schema changes needed.

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
- Partner (Rory) must NEVER see: `invoiceAmount`, `costAmount`, `stockReturnPolicy`, `cardPaymentPrice`, `cardPaymentCommission`
- Partner sees confirmed+ events only — filter in `listEvents()` and `getEvent()`
- Partner has no access to: dashboard, event creation, event editing, Send to LC, status changes

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
