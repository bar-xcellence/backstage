# Backstage — Claude Context

Bar Excellence's events preparation and dispatch system. Bespoke tool for 3 users: Murdo (owner), Rob (super_admin), Rory at LC (partner, read-only).

## Quick Reference

- **Stack:** Next.js 16.2 App Router, React 19, TypeScript 5, Tailwind v4, Drizzle ORM, NeonDB, Resend, Vitest
- **Design system:** Reserve Noir — see `stitch_backstage_events_dashboard/reserve_noir/DESIGN.md`
- **Auth:** Custom magic link (Resend + iron-session), NOT Auth.js. See `src/lib/session.ts`
- **Role check:** Always use `requireRole()` from `src/lib/session.ts` in every server action
- **Schema:** `src/db/schema.ts` — single source of truth for all tables
- **Tests:** `npm run test -- --run` (Vitest, `src/**/*.test.ts`)
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
