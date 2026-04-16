# Backstage

**Bar Excellence Events Preparation and Dispatch System**

Backstage is Bar Excellence's internal events management tool for the Liquor Collective (LC) partnership. It replaces manual Word-to-email event brief creation with structured data entry, automated stock calculation and one-button dispatch to LC.

## What It Does

- **Event Management:** Create and manage events through a pipeline (Enquiry, Confirmed, Preparation, Ready, Delivered)
- **Recipe Library:** Seasonal cocktail database with full specs, ingredients and garnishes
- **Stock Calculator:** Algorithmic calculation of exact ingredient quantities from event guest count and cocktail selection
- **Send to LC:** One-button generation and delivery of formatted event briefs via email, with downloadable PDF
- **Partner Access:** Read-only view for Liquor Collective (confirmed events only, no financial data)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router, Server Components, Server Actions) |
| Runtime | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Auth | Custom magic link (Resend + iron-session) |
| Database | NeonDB (PostgreSQL, serverless) |
| ORM | Drizzle ORM |
| Email | Resend |
| PDF | @react-pdf/renderer |
| UI Components | shadcn/ui (restyled to Reserve Noir design system) |
| Testing | Vitest + Playwright |
| Hosting | Vercel |

## Design System: Reserve Noir

Backstage uses the Reserve Noir design system, a "Digital Maitre D'" aesthetic:

- **Sharp edges:** 0px border-radius on all structural elements
- **Palette:** Charcoal (#1E1F2E), Cream (#FAF9F6), Gold (#A4731E)
- **Typography:** Cormorant Garamond (headings, weight 300) + Raleway (body, weights 400/600)
- **Principles:** No-line rule (background shifts over borders), ghost borders, tonal layering, luxury easing

## Access Levels

| User | Role | Access |
|---|---|---|
| Murdo MacLeod | Owner | Full CRUD including financials |
| Rob | Super Admin | Full CRUD plus system configuration |
| Rory (LC) | Partner | Read-only: confirmed+ events, no financials |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your NeonDB, Resend, and session secret values

# Run database migrations
npx drizzle-kit push

# Start development server
npm run dev
```

## Environment Variables

Create a `.env.local` file with:

```
# Database
DATABASE_URL=postgresql://...@....neon.tech/backstage

# Auth
SESSION_SECRET=<generate-a-64-char-random-string>
MAGIC_LINK_SECRET=<generate-a-64-char-random-string>

# Email (Resend)
RESEND_API_KEY=re_...
FROM_EMAIL=backstage@bar-excellence.app

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Project Structure

```
backstage/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── actions/          # Server Actions (event CRUD, stock calc, send-to-LC)
│   ├── db/               # Drizzle schema and database client
│   ├── lib/              # Auth, email templates, PDF templates, utilities
│   └── components/       # UI components (shadcn/ui + custom)
├── docs/                 # Project documentation
├── drizzle/              # Generated migrations
└── tests/                # Vitest unit tests + Playwright E2E
```

## Documentation

- `docs/design-doc.md` — Approved design document with architecture decisions
- `docs/TODOS.md` — Outstanding tasks and prerequisites
- `backstage-complete-documentation.md` — Full PRD, tech stack and frontend design spec

## Phased Build Plan

- **Phase 1 (Days 1-4):** Branded login, event CRUD, recipe library, stock calculator, Send to LC
- **Phase 2 (Days 5-7):** Pipeline kanban, dashboard, checklist tracking
- **Phase 3 (Days 8-10):** Partner view, equipment templates, 48-hour alerts

## Deployment

Deployed to Vercel at `backstage.bar-excellence.app`. Auto-deploys on push to `main`.

---

**Client:** Bar Excellence (Murdo MacLeod)
**Built by:** Rob (CTO/Digital Strategist)
