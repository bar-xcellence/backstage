# Phase 1: Core Loop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the core event-to-brief pipeline — branded login, event CRUD, recipe library, stock calculator and one-button Send to LC email dispatch.

**Architecture:** Next.js 16.2 App Router with Server Actions for all mutations. Custom magic link auth (Resend + iron-session). NeonDB PostgreSQL via Drizzle ORM. Reserve Noir design system (0px radius, charcoal/cream/gold, Cormorant Garamond + Raleway). Email delivery via Resend + React Email. PDF on-demand via @react-pdf/renderer.

**Tech Stack:**
- Next.js 16.2, React 19, TypeScript 5, Tailwind CSS v4
- iron-session 8.0.4, resend 6.11.0, @react-email/components (latest)
- drizzle-orm 0.45.2, @neondatabase/serverless, drizzle-kit
- @react-pdf/renderer 4.4.1, @vercel/blob
- Vitest, Playwright, shadcn/ui

**Eng Review Decisions (binding):**
1. Custom magic link auth (no Auth.js v5)
2. App-level role checks + partner VIEW (no RLS)
3. Email first, PDF separate (decoupled)
4. Full error handling on Send to LC (retry, bounce, idempotent)
5. requireRole() helper for DRY auth checks
6. All stock calculator edge cases handled
7. Vitest + Playwright test stack
8. Single JOIN query for stock calculator

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `tailwind.config.ts` (Reserve Noir tokens)
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`

**Step 1: Scaffold Next.js project**

```bash
cd /Users/roberthayford/Git/bar-excellence/backstage
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --yes
```

Note: this will scaffold into the existing directory. It may ask to overwrite files — accept.

**Step 2: Install dependencies**

```bash
npm install iron-session@8.0.4 resend@latest @react-email/components@latest drizzle-orm@latest @neondatabase/serverless @react-pdf/renderer@latest @vercel/blob jose
npm install -D drizzle-kit vitest @vitejs/plugin-react playwright @playwright/test
```

Key packages:
- `jose` — JWT signing/verification for magic links (no heavy crypto dependency)
- `iron-session` — encrypted cookie-based sessions
- `@neondatabase/serverless` — Neon HTTP driver for Vercel

**Step 3: Add Reserve Noir fonts to layout**

Edit `src/app/layout.tsx`:

```tsx
import { Cormorant_Garamond, Raleway } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-cormorant',
  display: 'swap',
})

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-raleway',
  display: 'swap',
})

export const metadata = {
  title: 'Backstage | Bar Excellence',
  description: 'Events preparation and dispatch system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${raleway.variable}`}>
      <body className="font-raleway bg-cream text-gold-ink antialiased">
        {children}
      </body>
    </html>
  )
}
```

**Step 4: Configure Tailwind with Reserve Noir tokens**

Edit `src/app/globals.css` (Tailwind v4 CSS-first config):

```css
@import "tailwindcss";

@theme {
  --color-charcoal: #1E1F2E;
  --color-cream: #FAF9F6;
  --color-gold: #A4731E;
  --color-gold-ink: #7A5416;
  --color-grey: #6B7280;
  --color-cognac: #B8860B;
  --color-botanical: #8B9D83;
  --color-error: #EF4444;
  --color-success: #4E8A3E;
  --color-warning: #D78B07;
  --color-surface-low: #F4F3F1;
  --color-surface-high: #E3E2E0;
  --color-outline: #D4C4B2;

  --font-family-cormorant: var(--font-cormorant), 'Cormorant Garamond', serif;
  --font-family-raleway: var(--font-raleway), 'Raleway', sans-serif;

  --radius-none: 0px;

  --ease-luxury: cubic-bezier(0.22, 1, 0.36, 1);
}

/* Global sharp edges — Reserve Noir enforced */
* {
  border-radius: 0 !important;
}
```

**Step 5: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Step 6: Add test scripts to package.json**

Add to `scripts` in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

**Step 7: Create .env.example**

Create `.env.example`:

```
# Database (NeonDB)
DATABASE_URL=postgresql://user:pass@host.neon.tech/backstage

# Auth
SESSION_SECRET=generate-a-64-char-random-string-here
MAGIC_LINK_SECRET=generate-a-64-char-random-string-here

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=backstage@bar-excellence.app

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 8: Verify scaffold works**

```bash
npm run dev
```

Expected: Next.js dev server starts on localhost:3000 with no errors.

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 16.2 project with Reserve Noir tokens and test config"
```

---

## Task 2: Database Schema and Connection

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/db/index.ts`
- Create: `src/db/schema.ts`
- Test: `src/db/schema.test.ts`

**Step 1: Write schema test**

Create `src/db/schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  events,
  users,
  cocktails,
  cocktailIngredients,
  cocktailGarnishes,
  eventCocktails,
  eventContacts,
} from './schema'

describe('Database Schema', () => {
  it('events table has all required columns', () => {
    const columns = Object.keys(events)
    expect(columns).toContain('id')
    expect(columns).toContain('eventName')
    expect(columns).toContain('eventDate')
    expect(columns).toContain('venueName')
    expect(columns).toContain('guestCount')
    expect(columns).toContain('status')
    expect(columns).toContain('invoiceAmount')
    expect(columns).toContain('lcSentAt')
  })

  it('cocktails table has required columns', () => {
    const columns = Object.keys(cocktails)
    expect(columns).toContain('id')
    expect(columns).toContain('name')
    expect(columns).toContain('defaultMenuName')
    expect(columns).toContain('season')
    expect(columns).toContain('glassType')
  })

  it('cocktailIngredients table has required columns', () => {
    const columns = Object.keys(cocktailIngredients)
    expect(columns).toContain('cocktailId')
    expect(columns).toContain('ingredientName')
    expect(columns).toContain('amount')
    expect(columns).toContain('unit')
  })

  it('users table has role column', () => {
    const columns = Object.keys(users)
    expect(columns).toContain('email')
    expect(columns).toContain('role')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/db/schema.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the schema**

Create `src/db/schema.ts`:

```typescript
import {
  pgTable,
  uuid,
  text,
  date,
  time,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const eventStatusEnum = pgEnum('event_status', [
  'enquiry', 'confirmed', 'preparation', 'ready', 'delivered', 'cancelled',
])

export const eventTypeEnum = pgEnum('event_type', [
  'masterclass', 'drinks_reception', 'team_building', 'corporate', 'exhibition', 'other',
])

export const serviceTypeEnum = pgEnum('service_type', [
  'cocktails_mocktails', 'smoothies', 'hybrid',
])

export const seasonEnum = pgEnum('season', [
  'spring', 'summer', 'autumn', 'winter', 'all_year',
])

export const glassTypeEnum = pgEnum('glass_type', [
  'rocks', 'coupe', 'highball', 'martini', 'flute', 'polycarb_rocks', 'other',
])

export const ingredientCategoryEnum = pgEnum('ingredient_category', [
  'spirit', 'puree', 'juice', 'syrup', 'citrus', 'modifier', 'foamer', 'soda', 'other',
])

export const ingredientUnitEnum = pgEnum('ingredient_unit', [
  'ml', 'g', 'drops', 'dash', 'piece', 'whole', 'bunch', 'sprig',
])

export const garnishCategoryEnum = pgEnum('garnish_category', [
  'fruit', 'botanical', 'decorative', 'spray',
])

export const userRoleEnum = pgEnum('user_role', [
  'owner', 'super_admin', 'partner',
])

// Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Events
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdBy: uuid('created_by').references(() => users.id),

  // Core
  eventName: text('event_name').notNull(),
  showName: text('show_name'),
  eventDate: date('event_date').notNull(),
  arriveTime: time('arrive_time'),
  setupDeadline: time('setup_deadline'),
  serviceStart: time('service_start'),
  serviceEnd: time('service_end'),
  departTime: time('depart_time'),
  venueName: text('venue_name').notNull(),
  venueHallRoom: text('venue_hall_room'),
  guestCount: integer('guest_count').notNull(),

  // Service configuration
  eventType: eventTypeEnum('event_type').default('corporate'),
  serviceType: serviceTypeEnum('service_type').default('cocktails_mocktails'),
  prepaidServes: integer('prepaid_serves'),
  stationCount: integer('station_count'),
  stationLayoutNotes: text('station_layout_notes'),
  batchingInstructions: text('batching_instructions'),

  // Staff
  staffCount: integer('staff_count'),
  staffNames: text('staff_names'),
  flairRequired: boolean('flair_required').default(false),

  // Equipment and setup
  popUpBar: boolean('pop_up_bar').default(false),
  popUpBarSupplier: text('pop_up_bar_supplier'),
  dryIce: boolean('dry_ice').default(false),
  menuFrameCount: integer('menu_frame_count'),
  menuNotes: text('menu_notes'),

  // Logistics
  installInstructions: text('install_instructions'),
  parkingInstructions: text('parking_instructions'),
  accessRoute: text('access_route'),
  vehicleReg: text('vehicle_reg'),

  // Card payment service
  cardPaymentService: boolean('card_payment_service').default(false),
  cardPaymentPrice: decimal('card_payment_price'),
  cardPaymentServes: integer('card_payment_serves'),
  cardPaymentCommission: decimal('card_payment_commission'),

  // Financial
  invoiceAmount: decimal('invoice_amount'),
  costAmount: decimal('cost_amount'),
  stockReturnPolicy: text('stock_return_policy'),

  // LC communication
  lcRecipient: text('lc_recipient').default('Rory'),
  lcSentAt: timestamp('lc_sent_at'),
  lcConfirmedAt: timestamp('lc_confirmed_at'),

  // Status and lifecycle
  status: eventStatusEnum('status').default('enquiry').notNull(),
  notesCustom: text('notes_custom'),
  outcomeNotes: text('outcome_notes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Event contacts (site clients)
export const eventContacts = pgTable('event_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  contactName: text('contact_name').notNull(),
  contactRole: text('contact_role'),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),
  isPrimary: boolean('is_primary').default(false),
  sortOrder: integer('sort_order').default(0),
})

// Cocktails (recipe library)
export const cocktails = pgTable('cocktails', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  defaultMenuName: text('default_menu_name').notNull(),
  defaultMenuDescription: text('default_menu_description'),
  season: seasonEnum('season').default('all_year'),
  glassType: glassTypeEnum('glass_type').default('rocks'),
  iceAmountG: integer('ice_amount_g'),
  iceType: text('ice_type'),
  straw: boolean('straw').default(false),
  strawType: text('straw_type'),
  category: text('category'),
  referenceImageUrl: text('reference_image_url'),
  isNonAlcoholic: boolean('is_non_alcoholic').default(false),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Cocktail ingredients
export const cocktailIngredients = pgTable('cocktail_ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  cocktailId: uuid('cocktail_id').references(() => cocktails.id, { onDelete: 'cascade' }).notNull(),
  ingredientName: text('ingredient_name').notNull(),
  ingredientCategory: ingredientCategoryEnum('ingredient_category').default('other'),
  amount: decimal('amount').notNull(),
  unit: ingredientUnitEnum('unit').notNull(),
  brand: text('brand'),
  isOptional: boolean('is_optional').default(false),
  sortOrder: integer('sort_order').default(0),
})

// Cocktail garnishes
export const cocktailGarnishes = pgTable('cocktail_garnishes', {
  id: uuid('id').primaryKey().defaultRandom(),
  cocktailId: uuid('cocktail_id').references(() => cocktails.id, { onDelete: 'cascade' }).notNull(),
  garnishName: text('garnish_name').notNull(),
  garnishCategory: garnishCategoryEnum('garnish_category').default('fruit'),
  quantity: decimal('quantity').notNull(),
  quantityUnit: text('quantity_unit').default('piece'),
  sortOrder: integer('sort_order').default(0),
})

// Event cocktails (junction)
export const eventCocktails = pgTable('event_cocktails', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  cocktailId: uuid('cocktail_id').references(() => cocktails.id).notNull(),
  menuName: text('menu_name').notNull(),
  menuDescription: text('menu_description'),
  stationNumber: integer('station_number'),
  servesAllocated: integer('serves_allocated'),
  sortOrder: integer('sort_order').default(0),
})

// Relations
export const eventsRelations = relations(events, ({ many, one }) => ({
  contacts: many(eventContacts),
  cocktails: many(eventCocktails),
  createdByUser: one(users, { fields: [events.createdBy], references: [users.id] }),
}))

export const cocktailsRelations = relations(cocktails, ({ many }) => ({
  ingredients: many(cocktailIngredients),
  garnishes: many(cocktailGarnishes),
  eventCocktails: many(eventCocktails),
}))

export const eventCocktailsRelations = relations(eventCocktails, ({ one }) => ({
  event: one(events, { fields: [eventCocktails.eventId], references: [events.id] }),
  cocktail: one(cocktails, { fields: [eventCocktails.cocktailId], references: [cocktails.id] }),
}))

export const cocktailIngredientsRelations = relations(cocktailIngredients, ({ one }) => ({
  cocktail: one(cocktails, { fields: [cocktailIngredients.cocktailId], references: [cocktails.id] }),
}))

export const cocktailGarnishesRelations = relations(cocktailGarnishes, ({ one }) => ({
  cocktail: one(cocktails, { fields: [cocktailGarnishes.cocktailId], references: [cocktails.id] }),
}))

export const eventContactsRelations = relations(eventContacts, ({ one }) => ({
  event: one(events, { fields: [eventContacts.eventId], references: [events.id] }),
}))
```

**Step 4: Create database client**

Create `src/db/index.ts`:

```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, { schema })
```

**Step 5: Create Drizzle config**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

**Step 6: Run tests**

```bash
npx vitest run src/db/schema.test.ts
```

Expected: PASS — all schema structure tests pass.

**Step 7: Commit**

```bash
git add src/db/ drizzle.config.ts
git commit -m "feat: add Drizzle schema for Phase 1 tables (events, cocktails, users)"
```

---

## Task 3: Auth System (Magic Link)

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/auth-config.ts`
- Create: `src/middleware.ts`
- Test: `src/lib/auth.test.ts`

**Step 1: Write auth tests**

Create `src/lib/auth.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createMagicLinkToken, verifyMagicLinkToken } from './auth'

// Mock jose for testing
vi.mock('jose', async () => {
  const actual = await vi.importActual('jose')
  return actual
})

describe('Magic Link Auth', () => {
  const secret = 'test-secret-that-is-at-least-32-characters-long-for-hs256'

  describe('createMagicLinkToken', () => {
    it('creates a valid JWT token for a known email', async () => {
      const token = await createMagicLinkToken('murdo@bar-excellence.app', secret)
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })
  })

  describe('verifyMagicLinkToken', () => {
    it('verifies a valid token and returns the email', async () => {
      const token = await createMagicLinkToken('murdo@bar-excellence.app', secret)
      const result = await verifyMagicLinkToken(token, secret)
      expect(result.email).toBe('murdo@bar-excellence.app')
    })

    it('rejects an expired token', async () => {
      // Create a token that expires immediately
      const token = await createMagicLinkToken('murdo@bar-excellence.app', secret, '0s')
      // Small delay to ensure expiry
      await new Promise(r => setTimeout(r, 100))
      await expect(verifyMagicLinkToken(token, secret)).rejects.toThrow()
    })

    it('rejects a tampered token', async () => {
      const token = await createMagicLinkToken('murdo@bar-excellence.app', secret)
      const tampered = token.slice(0, -5) + 'xxxxx'
      await expect(verifyMagicLinkToken(tampered, secret)).rejects.toThrow()
    })
  })
})

describe('requireRole', () => {
  // These tests will use mocked session
  it('is exported from auth module', async () => {
    const mod = await import('./auth')
    expect(mod.requireRole).toBeDefined()
    expect(typeof mod.requireRole).toBe('function')
  })
})
```

**Step 2: Run test to verify failure**

```bash
npx vitest run src/lib/auth.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement auth module**

Create `src/lib/auth-config.ts`:

```typescript
import type { SessionOptions } from 'iron-session'

export interface SessionData {
  userId: string
  email: string
  name: string
  role: 'owner' | 'super_admin' | 'partner'
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'backstage-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}

// Only these 3 emails can log in
export const ALLOWED_EMAILS = [
  'murdo@bar-excellence.app',
  'rob@roberthayford.com',
  'rory@lc-group.com', // Update with Rory's actual email
] as const
```

Create `src/lib/auth.ts`:

```typescript
import { SignJWT, jwtVerify } from 'jose'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sessionOptions, ALLOWED_EMAILS } from './auth-config'
import type { SessionData } from './auth-config'

// --- Magic Link Token ---

export async function createMagicLinkToken(
  email: string,
  secret: string,
  expiresIn: string = '15m'
): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key)
}

export async function verifyMagicLinkToken(
  token: string,
  secret: string
): Promise<{ email: string }> {
  const key = new TextEncoder().encode(secret)
  const { payload } = await jwtVerify(token, key)
  return { email: payload.email as string }
}

// --- Session Management ---

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  if (!session.isLoggedIn) return null
  return session
}

export async function createSession(data: Omit<SessionData, 'isLoggedIn'>): Promise<void> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  session.userId = data.userId
  session.email = data.email
  session.name = data.name
  session.role = data.role
  session.isLoggedIn = true
  await session.save()
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  session.destroy()
}

// --- Role-Based Access (Eng Review Issue 5A) ---

export async function requireRole(
  ...allowedRoles: SessionData['role'][]
): Promise<SessionData> {
  const session = await getSession()
  if (!session) {
    redirect('/auth/signin')
  }
  if (!allowedRoles.includes(session.role)) {
    throw new Error('Forbidden: insufficient permissions')
  }
  return session
}

// --- Email Validation ---

export function isAllowedEmail(email: string): boolean {
  return (ALLOWED_EMAILS as readonly string[]).includes(email.toLowerCase().trim())
}
```

**Step 4: Run tests**

```bash
npx vitest run src/lib/auth.test.ts
```

Expected: PASS.

**Step 5: Create middleware**

Create `src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions } from '@/lib/auth-config'
import type { SessionData } from '@/lib/auth-config'

const PUBLIC_PATHS = ['/auth/signin', '/auth/verify', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Check session via cookie
  const response = NextResponse.next()
  const session = await getIronSession<SessionData>(request, response, sessionOptions)

  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
```

**Step 6: Commit**

```bash
git add src/lib/auth.ts src/lib/auth-config.ts src/lib/auth.test.ts src/middleware.ts
git commit -m "feat: custom magic link auth with iron-session and requireRole helper"
```

---

## Task 4: Auth Server Actions and Branded Login Page

**Files:**
- Create: `src/actions/auth.ts`
- Create: `src/app/auth/signin/page.tsx`
- Create: `src/app/auth/verify/page.tsx`
- Create: `src/app/auth/verify/route.ts`

**Step 1: Create auth server actions**

Create `src/actions/auth.ts`:

```typescript
'use server'

import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { createMagicLinkToken, createSession, isAllowedEmail, destroySession } from '@/lib/auth'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendMagicLink(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const email = (formData.get('email') as string)?.toLowerCase().trim()

  if (!email) {
    return { error: 'Email is required' }
  }

  if (!isAllowedEmail(email)) {
    // Don't reveal whether the email exists — generic message
    return { error: 'If this email is registered, a login link has been sent' }
  }

  try {
    const token = await createMagicLinkToken(email, process.env.MAGIC_LINK_SECRET!)
    const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`

    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: email,
      subject: 'Sign in to Backstage',
      html: `
        <div style="font-family: 'Raleway', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #FAF9F6;">
          <h1 style="font-family: 'Cormorant Garamond', serif; font-weight: 300; color: #1E1F2E; font-size: 28px; margin-bottom: 24px;">Backstage</h1>
          <p style="color: #7A5416; font-size: 14px; line-height: 1.6;">Click the link below to sign in. This link expires in 15 minutes.</p>
          <a href="${magicLink}" style="display: inline-block; margin-top: 24px; padding: 12px 32px; background: #A4731E; color: #FAF9F6; text-decoration: none; font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase;">SIGN IN</a>
          <p style="color: #6B7280; font-size: 12px; margin-top: 32px;">Bar Excellence Events</p>
        </div>
      `,
    })

    return { success: true }
  } catch {
    return { error: 'Failed to send login link. Please try again.' }
  }
}

export async function verifyMagicLink(token: string): Promise<{ error?: string; redirect?: string }> {
  try {
    const { verifyMagicLinkToken } = await import('@/lib/auth')
    const { email } = await verifyMagicLinkToken(token, process.env.MAGIC_LINK_SECRET!)

    // Find user in database
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (!user) {
      return { error: 'Account not found' }
    }

    // Create session
    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    // Redirect based on role
    return { redirect: user.role === 'partner' ? '/events' : '/' }
  } catch {
    return { error: 'Invalid or expired link. Please request a new one.' }
  }
}

export async function signOut(): Promise<void> {
  await destroySession()
}
```

**Step 2: Create branded login page (Reserve Noir)**

Create `src/app/auth/signin/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { sendMagicLink } from '@/actions/auth'

export default function SignInPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    const result = await sendMagicLink(formData)
    setLoading(false)

    if (result.error) {
      // For security, "If this email is registered..." shows as success
      if (result.error.includes('If this email')) {
        setSent(true)
      } else {
        setError(result.error)
      }
    }
    if (result.success) {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo and heading */}
        <div className="text-center mb-12">
          <h1 className="font-cormorant text-4xl font-light text-cream tracking-tight">
            Backstage
          </h1>
          <p className="font-raleway text-[11px] font-medium tracking-[0.18em] uppercase text-grey mt-2">
            Bar Excellence Events
          </p>
        </div>

        {sent ? (
          /* Success state */
          <div className="bg-cream p-8">
            <h2 className="font-cormorant text-xl font-light text-charcoal mb-3">
              Check your email
            </h2>
            <p className="font-raleway text-sm text-gold-ink leading-relaxed">
              If your email is registered, a sign-in link has been sent.
              The link expires in 15 minutes.
            </p>
            <button
              onClick={() => { setSent(false); setError('') }}
              className="mt-6 text-gold text-[11px] font-semibold tracking-[0.16em] uppercase hover:text-gold-ink transition-colors duration-200"
              style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            >
              TRY ANOTHER EMAIL
            </button>
          </div>
        ) : (
          /* Login form */
          <form action={handleSubmit} className="bg-cream p-8">
            <label
              htmlFor="email"
              className="block font-raleway text-[11px] font-medium tracking-[0.18em] uppercase text-grey mb-2"
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
              className="w-full px-4 py-3 bg-transparent border-b-2 border-outline/15 text-charcoal font-raleway text-sm focus:border-gold focus:outline-none transition-colors duration-200 placeholder:text-grey/50"
              style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
              placeholder="murdo@bar-excellence.app"
            />

            {error && (
              <p className="mt-3 text-error text-sm font-raleway">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 py-3 bg-gold text-cream font-raleway text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-50 min-h-[44px]"
              style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            >
              {loading ? 'SENDING...' : 'SIGN IN'}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-grey/50 text-[10px] font-raleway tracking-[0.16em] uppercase mt-8">
          Backstage v1.0
        </p>
      </div>
    </div>
  )
}
```

**Step 3: Create magic link verification route**

Create `src/app/auth/verify/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyMagicLink } from '@/actions/auth'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin?error=missing-token', request.url))
  }

  const result = await verifyMagicLink(token)

  if (result.error) {
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(result.error)}`, request.url)
    )
  }

  return NextResponse.redirect(new URL(result.redirect || '/', request.url))
}
```

**Step 4: Commit**

```bash
git add src/actions/auth.ts src/app/auth/
git commit -m "feat: branded login page with magic link auth (Reserve Noir)"
```

---

## Task 5: Layout Shell (Sidebar + Content)

**Files:**
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/app-shell.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/app/page.tsx` (redirect to events for now)

**Step 1: Create sidebar component**

Create `src/components/layout/sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SessionData } from '@/lib/auth-config'

const ownerNav = [
  { label: 'DASHBOARD', href: '/', icon: '□' },
  { label: 'EVENTS', href: '/events', icon: '□' },
  { label: 'RECIPES', href: '/recipes', icon: '□' },
  { label: 'SETTINGS', href: '/settings', icon: '□' },
]

const partnerNav = [
  { label: 'EVENTS', href: '/events', icon: '□' },
  { label: 'RECIPES', href: '/recipes', icon: '□' },
]

export function Sidebar({ user }: { user: SessionData }) {
  const pathname = usePathname()
  const nav = user.role === 'partner' ? partnerNav : ownerNav

  return (
    <aside className="w-64 bg-charcoal min-h-screen flex flex-col justify-between py-6 px-4">
      <div>
        {/* Brand */}
        <div className="px-2 mb-10">
          <h2 className="font-cormorant text-lg font-light text-cream tracking-tight">
            Bar Excellence
          </h2>
          <p className="font-raleway text-[10px] font-medium tracking-[0.18em] uppercase text-grey mt-1">
            Premium Hospitality
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {nav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 font-raleway text-[11px] font-medium tracking-[0.16em] uppercase transition-colors duration-200 min-h-[44px] ${
                  isActive
                    ? 'bg-gold/10 text-gold border-l-2 border-gold'
                    : 'text-grey hover:text-cream hover:bg-cream/5'
                }`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User info */}
      <div className="px-2">
        <p className="font-raleway text-sm text-cream">{user.name}</p>
        <p className="font-raleway text-[10px] tracking-[0.18em] uppercase text-grey mt-0.5">
          {user.role === 'partner' ? 'LC Partner' : user.role === 'owner' ? 'Owner' : 'Admin'}
        </p>
      </div>
    </aside>
  )
}
```

**Step 2: Create app shell**

Create `src/components/layout/app-shell.tsx`:

```tsx
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from './sidebar'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/auth/signin')

  return (
    <div className="flex min-h-screen">
      <Sidebar user={session} />
      <main className="flex-1 bg-cream px-6 py-8 lg:px-8">
        {children}
      </main>
    </div>
  )
}
```

**Step 3: Update root layout and create dashboard redirect**

Update `src/app/layout.tsx` to wrap with AppShell for authenticated routes. Create a route group:

Create `src/app/(authenticated)/layout.tsx`:

```tsx
import { AppShell } from '@/components/layout/app-shell'

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
```

Create `src/app/(authenticated)/page.tsx`:

```tsx
import { redirect } from 'next/navigation'

export default function DashboardPage() {
  // Phase 1: redirect to events. Phase 2 will add the full dashboard.
  redirect('/events')
}
```

Move events and recipes routes under `(authenticated)` group.

**Step 4: Commit**

```bash
git add src/components/layout/ src/app/\(authenticated\)/
git commit -m "feat: app shell with charcoal sidebar and route groups"
```

---

## Task 6: Event CRUD

**Files:**
- Create: `src/actions/events.ts`
- Create: `src/app/(authenticated)/events/page.tsx`
- Create: `src/app/(authenticated)/events/new/page.tsx`
- Create: `src/app/(authenticated)/events/[id]/page.tsx`
- Create: `src/components/events/event-form.tsx`
- Create: `src/components/events/event-list.tsx`
- Test: `src/actions/events.test.ts`

This is a large task. Implement in this order:
1. Server Actions with tests (createEvent, updateEvent, getEvent, listEvents)
2. Event list page
3. Event creation form
4. Event detail page

**Step 1: Write event action tests**

Create `src/actions/events.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

// Mock the database for unit tests
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'test-uuid' }]) }) }),
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
  },
}))

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn().mockResolvedValue({
    userId: 'test-user',
    email: 'murdo@bar-excellence.app',
    name: 'Murdo',
    role: 'owner',
    isLoggedIn: true,
  }),
}))

describe('Event validation', () => {
  it('validates that event name is required', () => {
    // Import validation logic
    const validateEvent = (data: Record<string, unknown>) => {
      const errors: string[] = []
      if (!data.eventName) errors.push('Event name is required')
      if (!data.eventDate) errors.push('Event date is required')
      if (!data.venueName) errors.push('Venue name is required')
      if (!data.guestCount || Number(data.guestCount) < 1) errors.push('Guest count must be at least 1')
      return errors
    }

    expect(validateEvent({})).toContain('Event name is required')
    expect(validateEvent({ eventName: 'Test', eventDate: '2026-05-01', venueName: 'ICC', guestCount: 100 })).toHaveLength(0)
  })
})
```

**Step 2: Implement event server actions**

Create `src/actions/events.ts` — full CRUD with role checks, validation, and the partner VIEW filtering (no financial data for partner role).

**Step 3: Build event list and form components**

Reserve Noir styled: cream cards with gold borders on hover, Cormorant headings, status badges with pipeline colours, 0px radius everywhere.

**Step 4-8: Build out pages, test, commit after each**

Each page gets its own commit:
- `git commit -m "feat: event CRUD server actions with validation"`
- `git commit -m "feat: event list page with status badges"`
- `git commit -m "feat: event creation form (Reserve Noir)"`
- `git commit -m "feat: event detail page with tabbed interface"`

---

## Task 7: Recipe Library (Pre-Seeded)

**Files:**
- Create: `src/actions/recipes.ts`
- Create: `src/app/(authenticated)/recipes/page.tsx`
- Create: `src/app/(authenticated)/recipes/[id]/page.tsx`
- Create: `src/components/recipes/recipe-card.tsx`
- Create: `src/db/seed.ts` (recipe seed data)

**Step 1: Create seed script with fallback cocktails**

Create `src/db/seed.ts` with ~10 well-known cocktails (Espresso Martini, Negroni, Mojito, Old Fashioned, Margarita, Whiskey Sour, Cosmopolitan, Daiquiri, Moscow Mule, Aperol Spritz) plus full ingredient specs and garnishes. Also seeds the 3 users (Murdo, Rob, Rory).

**Step 2: Build recipe list and detail pages**

Grid layout with cards showing cocktail name, season badge, and glass type. Ken Burns hover effect on images. Season filter tabs (Spring, Summer, Autumn, Winter, All).

**Step 3: Commit**

```bash
git commit -m "feat: recipe library with seed data and season filtering"
```

---

## Task 8: Cocktail Selection Per Event

**Files:**
- Create: `src/components/events/cocktail-selector.tsx`
- Modify: `src/app/(authenticated)/events/[id]/page.tsx`
- Create: `src/actions/event-cocktails.ts`

**Step 1: Build cocktail selector component**

A searchable/filterable component that lets Murdo pick cocktails from the recipe library for an event. Each selected cocktail shows menu name (editable), description (editable), station number, and serves allocated.

**Step 2: Wire up to event detail page**

Add a "Cocktails" tab to the event detail that shows selected cocktails and the selector.

**Step 3: Commit**

```bash
git commit -m "feat: cocktail selection per event with menu name overrides"
```

---

## Task 9: Stock Calculator

**Files:**
- Create: `src/lib/stock-calculator.ts`
- Create: `src/components/events/stock-list.tsx`
- Test: `src/lib/stock-calculator.test.ts`

**Step 1: Write comprehensive stock calculator tests**

Create `src/lib/stock-calculator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateStock, BOTTLE_SIZES } from './stock-calculator'

describe('Stock Calculator', () => {
  const mockCocktails = [
    {
      servesAllocated: 50,
      ingredients: [
        { ingredientName: 'Vodka', amount: 50, unit: 'ml' as const, brand: 'Absolut', ingredientCategory: 'spirit' as const },
        { ingredientName: 'Coffee Liqueur', amount: 25, unit: 'ml' as const, brand: 'Kahlua', ingredientCategory: 'spirit' as const },
        { ingredientName: 'Espresso', amount: 30, unit: 'ml' as const, brand: null, ingredientCategory: 'other' as const },
      ],
      garnishes: [
        { garnishName: 'Coffee Beans', quantity: 3, quantityUnit: 'piece' },
      ],
    },
  ]

  it('calculates correct quantities for a single cocktail', () => {
    const result = calculateStock(mockCocktails)
    const vodka = result.ingredients.find(i => i.ingredientName === 'Vodka')

    // 50 serves x 50ml = 2500ml x 1.15 buffer = 2875ml
    // ceil(2875 / 700) = 5 bottles
    expect(vodka?.totalMl).toBe(2875)
    expect(vodka?.purchaseUnits).toBe(5)
    expect(vodka?.bottleSize).toBe(700)
  })

  it('aggregates same ingredient across multiple cocktails', () => {
    const twoCocktails = [
      {
        servesAllocated: 100,
        ingredients: [
          { ingredientName: 'Vodka', amount: 30, unit: 'ml' as const, brand: 'Absolut', ingredientCategory: 'spirit' as const },
        ],
        garnishes: [],
      },
      {
        servesAllocated: 100,
        ingredients: [
          { ingredientName: 'Vodka', amount: 45, unit: 'ml' as const, brand: 'Absolut', ingredientCategory: 'spirit' as const },
        ],
        garnishes: [],
      },
    ]

    const result = calculateStock(twoCocktails)
    const vodka = result.ingredients.find(i => i.ingredientName === 'Vodka')

    // (100*30 + 100*45) = 7500ml x 1.15 = 8625ml
    // ceil(8625 / 700) = 13 bottles
    expect(vodka?.totalMl).toBe(8625)
    expect(vodka?.purchaseUnits).toBe(13)
  })

  it('handles 0 cocktails gracefully', () => {
    const result = calculateStock([])
    expect(result.ingredients).toHaveLength(0)
    expect(result.garnishes).toHaveLength(0)
    expect(result.manualItems).toHaveLength(0)
    expect(result.warnings).toContain('No cocktails selected')
  })

  it('handles 0 serves gracefully', () => {
    const zeroCocktails = [{
      servesAllocated: 0,
      ingredients: [
        { ingredientName: 'Vodka', amount: 50, unit: 'ml' as const, brand: null, ingredientCategory: 'spirit' as const },
      ],
      garnishes: [],
    }]
    const result = calculateStock(zeroCocktails)
    expect(result.warnings).toContain('Some cocktails have 0 serves allocated')
  })

  it('separates non-ml units into manual items', () => {
    const dropsRecipe = [{
      servesAllocated: 50,
      ingredients: [
        { ingredientName: 'Angostura Bitters', amount: 3, unit: 'drops' as const, brand: null, ingredientCategory: 'modifier' as const },
      ],
      garnishes: [],
    }]
    const result = calculateStock(dropsRecipe)
    expect(result.manualItems).toHaveLength(1)
    expect(result.manualItems[0].ingredientName).toBe('Angostura Bitters')
    expect(result.manualItems[0].totalQuantity).toBe(150) // 50 x 3
    expect(result.manualItems[0].unit).toBe('drops')
  })

  it('skips ingredients with 0 amount', () => {
    const zeroAmount = [{
      servesAllocated: 50,
      ingredients: [
        { ingredientName: 'Nothing', amount: 0, unit: 'ml' as const, brand: null, ingredientCategory: 'other' as const },
      ],
      garnishes: [],
    }]
    const result = calculateStock(zeroAmount)
    expect(result.ingredients).toHaveLength(0)
  })

  it('calculates garnishes with 10% buffer', () => {
    const result = calculateStock(mockCocktails)
    const beans = result.garnishes.find(g => g.garnishName === 'Coffee Beans')

    // 50 serves x 3 = 150 x 1.10 = 165
    expect(beans?.totalWithBuffer).toBe(165)
  })

  it('keeps separate rows for same ingredient with different brands', () => {
    const diffBrands = [
      {
        servesAllocated: 50,
        ingredients: [
          { ingredientName: 'Vodka', amount: 50, unit: 'ml' as const, brand: 'Absolut', ingredientCategory: 'spirit' as const },
        ],
        garnishes: [],
      },
      {
        servesAllocated: 50,
        ingredients: [
          { ingredientName: 'Vodka', amount: 50, unit: 'ml' as const, brand: 'Grey Goose', ingredientCategory: 'spirit' as const },
        ],
        garnishes: [],
      },
    ]
    const result = calculateStock(diffBrands)
    const vodkas = result.ingredients.filter(i => i.ingredientName === 'Vodka')
    expect(vodkas).toHaveLength(2)
  })

  it('rounds purchase units UP (ceiling)', () => {
    const small = [{
      servesAllocated: 1,
      ingredients: [
        { ingredientName: 'Vodka', amount: 50, unit: 'ml' as const, brand: null, ingredientCategory: 'spirit' as const },
      ],
      garnishes: [],
    }]
    const result = calculateStock(small)
    const vodka = result.ingredients.find(i => i.ingredientName === 'Vodka')
    // 1 x 50 = 50ml x 1.15 = 57.5ml, ceil(57.5/700) = 1 bottle
    expect(vodka?.purchaseUnits).toBe(1)
  })
})
```

**Step 2: Run tests to verify failure**

```bash
npx vitest run src/lib/stock-calculator.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement stock calculator**

Create `src/lib/stock-calculator.ts`:

```typescript
// Bottle sizes — application-level constants (UK standard)
export const BOTTLE_SIZES: Record<string, number> = {
  spirit: 700,
  modifier: 700,
  juice: 1000,
  syrup: 1000,
  puree: 500,
  citrus: 1000,
  foamer: 500,
  soda: 1000,
  other: 1000,
}

const ML_UNITS = new Set(['ml', 'g'])
const WASTAGE_BUFFER = 1.15
const GARNISH_BUFFER = 1.10

interface CocktailInput {
  servesAllocated: number
  ingredients: {
    ingredientName: string
    amount: number
    unit: string
    brand: string | null
    ingredientCategory: string
  }[]
  garnishes: {
    garnishName: string
    quantity: number
    quantityUnit: string
  }[]
}

interface IngredientResult {
  ingredientName: string
  brand: string | null
  ingredientCategory: string
  totalMl: number
  purchaseUnits: number
  bottleSize: number
}

interface GarnishResult {
  garnishName: string
  totalQuantity: number
  totalWithBuffer: number
  quantityUnit: string
}

interface ManualItem {
  ingredientName: string
  totalQuantity: number
  unit: string
  brand: string | null
}

interface StockResult {
  ingredients: IngredientResult[]
  garnishes: GarnishResult[]
  manualItems: ManualItem[]
  warnings: string[]
}

export function calculateStock(cocktails: CocktailInput[]): StockResult {
  const warnings: string[] = []

  if (cocktails.length === 0) {
    return { ingredients: [], garnishes: [], manualItems: [], warnings: ['No cocktails selected'] }
  }

  if (cocktails.some(c => c.servesAllocated === 0)) {
    warnings.push('Some cocktails have 0 serves allocated')
  }

  // Aggregate ingredients by name + brand
  const ingredientMap = new Map<string, { totalMl: number; brand: string | null; ingredientCategory: string; ingredientName: string }>()
  const manualItems: ManualItem[] = []

  for (const cocktail of cocktails) {
    for (const ing of cocktail.ingredients) {
      if (ing.amount === 0) continue

      if (!ML_UNITS.has(ing.unit)) {
        // Non-ml units go to manual items
        const total = cocktail.servesAllocated * ing.amount
        manualItems.push({
          ingredientName: ing.ingredientName,
          totalQuantity: total,
          unit: ing.unit,
          brand: ing.brand,
        })
        continue
      }

      const key = `${ing.ingredientName}||${ing.brand || ''}`
      const existing = ingredientMap.get(key)
      const amount = cocktail.servesAllocated * ing.amount

      if (existing) {
        existing.totalMl += amount
      } else {
        ingredientMap.set(key, {
          totalMl: amount,
          brand: ing.brand,
          ingredientCategory: ing.ingredientCategory,
          ingredientName: ing.ingredientName,
        })
      }
    }
  }

  // Calculate purchase units
  const ingredients: IngredientResult[] = []
  for (const item of ingredientMap.values()) {
    const withBuffer = Math.round(item.totalMl * WASTAGE_BUFFER)
    const bottleSize = BOTTLE_SIZES[item.ingredientCategory] || 1000
    ingredients.push({
      ingredientName: item.ingredientName,
      brand: item.brand,
      ingredientCategory: item.ingredientCategory,
      totalMl: withBuffer,
      purchaseUnits: Math.ceil(withBuffer / bottleSize),
      bottleSize,
    })
  }

  // Aggregate garnishes
  const garnishMap = new Map<string, { total: number; quantityUnit: string }>()
  for (const cocktail of cocktails) {
    for (const g of cocktail.garnishes) {
      const key = g.garnishName
      const total = cocktail.servesAllocated * g.quantity
      const existing = garnishMap.get(key)
      if (existing) {
        existing.total += total
      } else {
        garnishMap.set(key, { total, quantityUnit: g.quantityUnit })
      }
    }
  }

  const garnishes: GarnishResult[] = []
  for (const [name, item] of garnishMap) {
    garnishes.push({
      garnishName: name,
      totalQuantity: item.total,
      totalWithBuffer: Math.round(item.total * GARNISH_BUFFER),
      quantityUnit: item.quantityUnit,
    })
  }

  // Sort by category then name
  ingredients.sort((a, b) => a.ingredientCategory.localeCompare(b.ingredientCategory) || a.ingredientName.localeCompare(b.ingredientName))
  garnishes.sort((a, b) => a.garnishName.localeCompare(b.garnishName))

  return { ingredients, garnishes, manualItems, warnings }
}
```

**Step 4: Run tests**

```bash
npx vitest run src/lib/stock-calculator.test.ts
```

Expected: ALL PASS (9 tests).

**Step 5: Build stock list UI component and wire to event detail**

**Step 6: Commit**

```bash
git commit -m "feat: stock calculator with full edge case handling and 9 unit tests"
```

---

## Task 10: Send to LC (Email)

**Files:**
- Create: `src/actions/send-to-lc.ts`
- Create: `src/lib/email/brief-email.tsx`
- Create: `src/components/events/send-to-lc-button.tsx`
- Test: `src/actions/send-to-lc.test.ts`

**Step 1: Write Send to LC tests**

Test: idempotent send (confirmation on re-send), missing required fields blocks send, no cocktails blocks send, email failure handling.

**Step 2: Implement brief email template**

React Email template matching the 15-section structure. Charcoal header, gold section headings on cream, Raleway body. Sections with missing optional data are gracefully omitted.

**Step 3: Implement send action with full error handling (Eng Review Issue 4A)**

- Retry with backoff on Resend 5xx (max 3 attempts)
- Check lc_sent_at before sending — if already sent, return `{ needsConfirmation: true }`
- Validate all required fields are present before sending
- Atomic: email sends first, then update lc_sent_at. If DB update fails, log warning but don't fail.

**Step 4: Build Send to LC button component**

Gold luxury button with confirmation dialog on re-send. Shows "SENT" state with timestamp. Loading state while sending.

**Step 5: Commit**

```bash
git commit -m "feat: Send to LC with email template, retry logic and idempotent send"
```

---

## Task 11: PDF Brief Generation (On-Demand)

**Files:**
- Create: `src/lib/pdf/brief-pdf.tsx`
- Create: `src/app/api/events/[id]/pdf/route.ts`
- Create: `src/components/events/download-pdf-button.tsx`

**Step 1: Implement PDF template**

@react-pdf/renderer template mirroring the email structure. A4 portrait, Liberation Serif for headings, Liberation Sans for body. All 15 sections.

**Step 2: Create API route for on-demand PDF generation**

GET /api/events/[id]/pdf — generates and streams the PDF. Includes try/catch with text-only fallback if images cause memory issues (Eng Review TODO).

**Step 3: Build download button**

"DOWNLOAD BRIEF" button on event detail page. Opens PDF in new tab or triggers download.

**Step 4: Commit**

```bash
git commit -m "feat: on-demand PDF brief generation with memory-safe fallback"
```

---

## Task 12: Deploy to Vercel

**Step 1: Create .env.local with real values**

Set up NeonDB project, Resend API key and domain verification, session secrets.

**Step 2: Run database migrations**

```bash
npx drizzle-kit push
```

**Step 3: Seed the database**

```bash
npx tsx src/db/seed.ts
```

**Step 4: Local smoke test**

```bash
npm run dev
```

Verify: login page renders, magic link sends, events CRUD works, stock calculator calculates, Send to LC sends email.

**Step 5: Run test suite**

```bash
npm run test
```

Expected: All unit tests pass.

**Step 6: Link to Vercel and deploy**

```bash
npx vercel link
npx vercel env add DATABASE_URL
npx vercel env add SESSION_SECRET
npx vercel env add MAGIC_LINK_SECRET
npx vercel env add RESEND_API_KEY
npx vercel env add FROM_EMAIL
npx vercel env add NEXT_PUBLIC_APP_URL
npx vercel --prod
```

**Step 7: Verify production**

Visit backstage.bar-excellence.app. Verify branded login, event creation, Send to LC.

**Step 8: Final commit and push**

```bash
git add -A
git commit -m "feat: Phase 1 complete — core loop deployed to Vercel"
git push origin main
```

---

## Phase 1 Checklist

- [ ] Task 1: Project scaffold with Reserve Noir tokens
- [ ] Task 2: Database schema (7 tables) with Drizzle
- [ ] Task 3: Custom magic link auth (Resend + iron-session)
- [ ] Task 4: Branded login page + verification route
- [ ] Task 5: Layout shell (charcoal sidebar + cream content)
- [ ] Task 6: Event CRUD (create, list, detail, update)
- [ ] Task 7: Recipe library (pre-seeded, season filter)
- [ ] Task 8: Cocktail selection per event
- [ ] Task 9: Stock calculator (9 unit tests, all edge cases)
- [ ] Task 10: Send to LC (email with retry, idempotent, error handling)
- [ ] Task 11: PDF brief generation (on-demand, memory-safe)
- [ ] Task 12: Deploy to Vercel

**Total estimated time with CC:** 3-4 days
**Tests:** ~30 unit tests (auth, stock calc, events), 5 E2E flows (Phase 2)
