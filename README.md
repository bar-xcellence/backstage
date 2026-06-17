# Backstage

**Bar Excellence Events Preparation and Dispatch System**

Backstage is Bar Excellence's internal events management tool for the Liquor Collective (LC) partnership. It replaces manual Word-to-email event brief creation with structured data entry, automated stock and equipment calculation, and one-button dispatch to LC.

It is a bespoke tool for a small, fixed set of users (the owner, a super admin, and read-only LC partners) — not a multi-tenant SaaS. Read `CLAUDE.md` before making changes: it is the authoritative guide to conventions, security rules, and the per-spec feature notes that this README summarises.

## What It Does

- **Role-aware dashboard** (`/`) — single landing route for all users. Owners see a KPI strip, an actions queue, and month-grouped event cards with financials; partners see a read-only month-of-cards view (no financials, confirmed+ events only).
- **Event management** — create and manage events through a pipeline: `enquiry → confirmed → preparation → ready → delivered` (plus `cancelled`). Structured multi-line venue address, host contact, pop-up bar, batching instructions, and per-event notes.
- **Recipe library + editor** — seasonal cocktail database with full specs, ingredients, garnishes, per-cocktail ice/straw/glassware, and reference images. Owners get in-app CRUD (create / edit / duplicate / archive); partners are read-only.
- **Stock calculator** — algorithmic ingredient quantities from guest count and cocktail selection.
- **Equipment templates** — reusable equipment lists with per-item scaling rules (per station / spirit / ingredient / guest / fixed).
- **Checklists & alerts** — per-event preparation checklists and 48-hour pre-event alerts.
- **Send to LC** — one-button generation and delivery of formatted event briefs by email, with a downloadable PDF (full and text-only variants). At-send recipient picker backed by a managed recipient list.
- **Settings** (`/settings`, owner + super_admin only) — managed LC recipient list (default To + auto-CC) and the outbound `from` email address.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, Server Components, Server Actions) |
| Runtime | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Auth | Custom magic link (Resend + iron-session) — **not** Auth.js |
| Database | NeonDB (PostgreSQL, serverless via `@neondatabase/serverless`) |
| ORM | Drizzle ORM |
| Email | Resend (`@react-email/components` for templates) |
| PDF | `@react-pdf/renderer` |
| File storage | UploadThing (`uploadthing`) — cocktail reference images |
| Drag & drop | `@hello-pangea/dnd` |
| Tables | `@tanstack/react-table` |
| Testing | Vitest (unit) + Playwright (E2E) |
| Hosting | Vercel |

> **Note on Drizzle + neon-http:** the serverless HTTP driver has **no transaction support**. Multi-step writes (e.g. "replace all child rows", "enforce at most one default recipient") are done as sequential statements with app-level invariants, not transactions. Keep this in mind when adding mutations.

## Design System: Reserve Noir

Backstage uses the Reserve Noir design system, a "Digital Maître D'" aesthetic. Full tokens and rules live in `stitch_backstage_events_dashboard/reserve_noir/DESIGN.md`.

- **Sharp edges:** 0px border-radius globally (enforced in `globals.css` — never add `border-radius`)
- **Palette:** Charcoal (#1E1F2E), Cream (#FAF9F6), Gold (#A4731E) — use Tailwind tokens (`text-gold`, `bg-charcoal`, `text-cream`)
- **Typography:** Cormorant Garamond (headings) + Raleway (body) via `var(--font-cormorant)` / `var(--font-raleway)`
- **Principles:** No-line rule (background shifts over borders), ghost borders, tonal layering, luxury easing
- **Touch targets:** minimum 44px on interactive elements
- **Empty states:** never "No items found" — always a warm heading + contextual body + a CTA where there's a clear next action

## Access Levels

Auth is an exact-match email allow-list (see `isAllowedEmail` in `src/actions/auth.ts`) — a wrong domain silently fails login.

| User | Email | Role | Access |
|---|---|---|---|
| Murdo MacLeod | `murdo@bar-excellence.co.uk` | Owner | Full CRUD including financials |
| Rob | `rob@roberthayford.com` | Super Admin | Full CRUD plus system configuration |
| Rory (LC) | `rory@lc-group.com` | Partner | Read-only: confirmed+ events, no financials |
| Murdo (LC view) | `murdo@hacien.com` | Partner | Read-only partner account (sees the LC-facing view) |

**Partner security is enforced server-side** — read the Role Security section of `CLAUDE.md` before touching anything partner-facing. The single sanitiser source of truth is `stripPartnerEvent()` (`src/lib/partner-event-sanitisation.ts`), backed by a pinned classification test (`partner-event-projection.test.ts`) that fails if a new `events` column is added without classifying it as partner-visible, stripped, or owner-only.

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your NeonDB, Resend, session secrets, and Blob token

# Push the schema to your database
npx drizzle-kit push

# Seed reference + demo data (uses .env.local)
npm run seed          # dev seed
npm run seed:prod     # production-safe seed (SEED_MODE=prod)

# Start the development server
npm run dev
```

## Environment Variables

See `.env.example` for the canonical list. Create a `.env.local` with:

```
# Database (NeonDB)
DATABASE_URL=postgresql://...@....neon.tech/backstage

# Auth
SESSION_SECRET=<generate-a-64-char-random-string>
MAGIC_LINK_SECRET=<generate-a-64-char-random-string>

# Email (Resend) — the bar-excellence.co.uk domain must be Resend-verified
RESEND_API_KEY=re_...
FROM_EMAIL=murdo@bar-excellence.co.uk

# App — hosting subdomain (prod: https://backstage.bar-excellence.app)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# UploadThing — required for cocktail reference image uploads in the recipe editor.
UPLOADTHING_TOKEN=
```

> `FROM_EMAIL` is a fallback. In production the outbound sender is read from the `app_settings.from_email` row (managed via `/settings`); the env var only applies when that setting is empty. The same goes for the LC recipient — `lc_recipients` rows drive the at-send picker.
>
> `ENABLE_TEST_AUTH=true` enables a test-only sign-in route (`/auth/test-signin`) used by the Playwright E2E suite. Never set this in production.

## Testing

TDD is the expected workflow — write the failing test first, then implement.

```bash
npm run test           # Vitest unit suite (src/**/*.test.ts)
npm run test:watch     # Vitest watch mode
npm run test:e2e       # Playwright E2E (boots `next start` with ENABLE_TEST_AUTH=true)
npm run test:e2e:ui    # Playwright UI mode
npm run build          # must pass before shipping
```

- Business-logic tests live alongside the code in `src/lib/*.test.ts`; schema tests in `src/db/schema.test.ts`.
- The partner projection test (`src/lib/partner-event-projection.test.ts`) is a security gate — keep it green.

## Project Structure

```
backstage/
├── src/
│   ├── app/
│   │   ├── (authenticated)/   # Dashboard (/), events, recipes, settings
│   │   ├── api/               # Event/recipe JSON + PDF + Blob upload routes
│   │   └── auth/              # signin / verify / test-signin
│   ├── actions/               # Server Actions — "use server", requireRole() first
│   ├── db/                    # Drizzle schema (schema.ts = single source of truth) + seed
│   ├── lib/                   # Auth/session, email & PDF templates, projections, utils (+ *.test.ts)
│   └── components/            # Client components — "use client"
├── docs/                      # Plans, specs, design doc, PRD, setup guides
├── drizzle/                   # Generated migrations
├── e2e/                       # Playwright specs
└── stitch_.../reserve_noir/   # Reserve Noir design system (DESIGN.md)
```

### Routes at a glance

| Route | Who | Purpose |
|---|---|---|
| `/` | All | Role-aware dashboard (partner cards / owner KPIs + actions) |
| `/events`, `/events/[id]` | All (partner sees stripped detail) | Event list + detail |
| `/events/new` | Owner / super_admin | Create event |
| `/recipes`, `/recipes/[id]` | All | Cocktail library + detail |
| `/recipes/new`, `/recipes/[id]/edit` | Owner / super_admin | Recipe editor |
| `/settings` | Owner / super_admin | LC recipients + from-email |

## Key Conventions for Contributors

These are the rules most likely to bite a new contributor — full detail in `CLAUDE.md`:

- **Every server action** starts with `"use server"` and calls `requireRole()` from `src/lib/session.ts` first. Revalidate paths after mutations (`revalidatePath("/events")`).
- **Client components** start with `"use client"`.
- **`src/db/schema.ts` is the single source of truth** for all tables. Adding an `events` column requires classifying it in `src/lib/partner-event-projection.ts` or the pinned test fails.
- **No transactions** (neon-http) — see the note in the Tech Stack section.
- **Conventional commits** (`feat:`, `fix:`, `chore:`, `refactor:`); commit per logical unit, don't batch unrelated changes.
- **Keep `CLAUDE.md` in sync** when you ship a spec/feature — it carries the per-spec implementation notes and a mistakes log.

## Documentation

| Doc | Purpose |
|---|---|
| `CLAUDE.md` | **Start here** — conventions, security rules, per-spec feature notes, mistakes log |
| `docs/design-doc.md` | Approved design document with architecture decisions |
| `docs/Backstage_Rory_Dashboard_PRD.md` | Partner dashboard PRD |
| `docs/production-setup.md` | Production environment setup guide |
| `docs/launch-readiness.md` | Launch readiness checklist |
| `docs/plans/` | Implementation plans per phase |
| `docs/superpowers/` | Feature specs and plans (e.g. recipe editor) |
| `docs/TODOS.md` | Outstanding tasks and design debt |
| `stitch_backstage_events_dashboard/reserve_noir/DESIGN.md` | Reserve Noir design tokens, rules, components |

## Deployment

Deployed to Vercel at `backstage.bar-excellence.app`. Auto-deploys on push to `main`. See `docs/production-setup.md` for the production environment and `docs/launch-readiness.md` for the launch checklist.

---

**Client:** Bar Excellence (Murdo MacLeod)
**Built by:** Rob (CTO/Digital Strategist)
