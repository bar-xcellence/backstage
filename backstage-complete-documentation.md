# Backstage - Complete Documentation

**Product:** Backstage (Bar Excellence Events Preparation and Dispatch System)
**Subdomain:** backstage.bar-excellence.app
**Client:** Bar Excellence (Murdo MacLeod)
**Author:** Rob (CTO/Digital Strategist)
**Date:** 9 April 2026

---

# Part 1: Project Overview

**Backstage** is Bar Excellence's events preparation and dispatch system for the Liquor Collective (LC) partnership. Deliberately separate from the Command Centre for data security. It replaces Murdo's current manual workflow of typing event briefs in Word documents and emailing them to Rory at LC.

The name reflects what the system does: everything that happens behind the scenes, behind the bar, before the guests arrive. Backstage complements the Command Centre in the product ecosystem. The Command Centre is where Murdo commands the business. Backstage is where events are prepared for the stage.

## Architecture Decision

The events ecosystem is **deliberately decoupled from the Command Centre**. The Command Centre will contain a link for Murdo's convenience but no data flows between them.

- **Murdo** sees everything: client charges, LC invoices, payment status, margins
- **LC (Rory)** gets restricted read-only access: event details, packing lists, stock lists, specs
- **LC cannot see**: revenue data, invoicing, margins, client relationship data

## Key Stakeholders

- **Murdo MacLeod** (Owner): Primary user, creates and manages all events
- **Rob** (CTO): System build and configuration
- **Rory at LC Group**: LC-side user, receives event briefs, confirmed as non-technical tester

## Revenue Model

- Standard 50/50 revenue split on total event booking value
- Card payment cocktail services: LC handles terminals, sends digital report, commission deducted from LC's overall invoice
- Third-party suppliers (e.g. pop-up bar hire): LC's responsibility to coordinate and pay

## Build Sequence

1. Data model and API (events, checklists, cocktails, equipment tables in NeonDB)
2. Event CRUD and pipeline view (Murdo can create and manage events)
3. Recipe library with stock calculator (algorithmic core)
4. Equipment templates (auto-population on event confirmation)
5. "Send to LC" one-button action (highest-impact feature)
6. LC restricted access (Rory's testing view)
7. 48-hour alert system (safety net against missed items)

---

# Part 2: Product Requirements Document (v2.1)

**Version:** 2.1 | **Date:** 9 April 2026 | **Status:** Draft

## 1. Problem Statement

Murdo currently creates event briefs manually in Word documents, typing every detail from scratch for each event. He then emails these to Rory at Liquor Collective. This process takes 30 to 60 minutes per brief and has caused real-world errors, including a missed NEC event where bartender kit details were forgotten, requiring an emergency drive back to site.

Backstage eliminates this manual process entirely by generating the complete brief from structured data entry, with one-button send to LC.

## 2. Architecture

**Deliberately separate from the Command Centre** for data security.

- Hosted on the same stack (Next.js 16.2, Tailwind CSS v4, NeonDB/PostgreSQL, Vercel)
- Accessible at backstage.bar-excellence.app
- Command Centre links to it for Murdo's convenience
- No data flows between Command Centre and Backstage
- Row-level security enforces access control

**Access levels:**

- **Murdo (Owner):** Full CRUD on all event data including financials
- **Rob (Super Admin):** Full CRUD plus system configuration
- **Rory / LC (Partner View):** Read-only access to event details, specs, stock lists, equipment, run sheets. Cannot see revenue, invoicing, margins or client relationship data

## 2.1 Authentication and Authorisation: WorkOS AuthKit + NeonDB RLS

**Decision:** WorkOS AuthKit for identity and session management, NeonDB Row-Level Security for database-level data access enforcement. Two layers of security operating independently.

**Why WorkOS AuthKit (over Neon Auth, Auth.js, Clerk):**

- Free for up to 1 million monthly active users (3 users in Backstage; cost is zero)
- Purpose-built Next.js App Router SDK with server-validated, cookie-based sessions
- First-class multi-tenancy: organisations, roles, member invitations built in
- MFA and passkeys supported natively
- Tamper-proof audit logs included
- Customisable JWT claims: user role injected into each JWT, passed through to NeonDB for RLS policy evaluation
- Radar: suspicious login detection and threat monitoring
- PKCE support for OAuth 2.1 compliance (added March 2026)
- Instant session revocation

**Three-layer security model:**

1. **Middleware (first line, routing only):** Redirects unauthenticated users to sign-in. Not relied upon for security.
2. **Server Actions and Route Handlers (application level):** Every action verifies the WorkOS session and checks the user role before proceeding.
3. **NeonDB RLS (database level, last line of defence):** PostgreSQL policies restrict which rows and columns each role can access.

**Role mapping:**

- WorkOS Organisation: "Bar Excellence Events"
- Murdo: Organisation admin, role = "owner"
- Rob: Organisation admin, role = "super_admin"
- Rory: Organisation member, role = "partner"

**JWT-to-RLS bridge (data access layer):**

```
async function withRLS(role, userId, queryFn) {
  await db.execute(SET LOCAL "app.user_role" = role)
  await db.execute(SET LOCAL "app.user_id" = userId)
  return queryFn()
}
```

**RLS policy examples:**

```sql
-- Murdo sees all events
CREATE POLICY "owner_full_access" ON events
  FOR ALL USING (current_setting('app.user_role') = 'owner');

-- Rory sees confirmed+ events only, no financial columns
CREATE POLICY "partner_read_confirmed" ON events
  FOR SELECT USING (
    current_setting('app.user_role') = 'partner'
    AND status IN ('confirmed','preparation','ready','delivered')
  );

-- Financial data hidden from partner via restricted view
CREATE VIEW events_partner AS
  SELECT id, event_name, show_name, event_date, venue_name,
         arrive_time, service_start, service_end, depart_time,
         guest_count, prepaid_serves, station_count, staff_count,
         status, notes_custom
  FROM events;

-- Recipe library: all roles can read
CREATE POLICY "all_read_cocktails" ON cocktails
  FOR SELECT USING (true);
```

## 3. Event Lifecycle Pipeline

**Stage 1: Enquiry** - Event created with basic details. Appears in pipeline.

**Stage 2: Confirmed** - System auto-generates checklist: cocktail specs, stock calculation, equipment list, setup format, staff assignments.

**Stage 3: Preparation** - Checklist tracking with per-item status (not started, in progress, complete).

**Stage 4: 48-Hour Trigger** - Incomplete checklist items turn red on dashboard. Optional email notification.

**Stage 5: Send to LC** - One-button action compiles all event info into formatted email via Resend + downloadable PDF.

**Stage 6: LC Confirmed** - Tracks acknowledgement from Rory.

**Stage 7: Post-Event** - Prompts for outcome notes, testimonial request trigger, revenue update.

## 4. Event Brief Output Format

The "Send to LC" output must match the structure Murdo currently writes manually:

1. **Date**
2. **Location** (venue name, hall/room, show/conference name, guest count)
3. **What** (service description, staff count and roles, special effects, serves count, pop-up bar)
4. **Times** (arrival, setup deadline, service start/end, departure)
5. **Site Clients** (Murdo as primary contact, venue/catering client name and mobile)
6. **Install** (step-by-step arrival and setup instructions, parking, access route)
7. **Equipment We Are Supplying** (item-by-item list from template, adjusted per event)
8. **Stations and Flow** (station count, which bartender makes which cocktail, batching notes)
9. **Cocktails As Written On Menu** (customer-facing names and poetic descriptions)
10. **Reference Images** (photos of what each cocktail must look like)
11. **Specs** (full recipe per cocktail with exact measurements)
12. **Stock List** (auto-calculated aggregate quantities for total serve count)
13. **Attire** (default: black waistcoat, bow tie, white shirt, black trousers, polished shoes)
14. **Notes** (standard notes bank with tick-on/tick-off plus custom free-text)
15. **Budget** (invoice total, card payment details if applicable, commission, stock return policy)

## 5. Data Model

### 5.1 Events Table

```
events
-- Core
id (uuid, PK)
client_id (FK -> clients)
contact_id (FK -> contacts)
event_name (text, required) -- e.g. "Cocktail Masterclass At KPMG"
show_name (text, nullable) -- e.g. "Digital Health Rewired 2026"
event_date (date)
arrive_time (time)
setup_deadline (time)
service_start (time)
service_end (time)
depart_time (time, nullable)
venue_name (text)
venue_hall_room (text, nullable) -- e.g. "Hall 4"
guest_count (int)

-- Service Configuration
event_type (enum: masterclass, drinks_reception, team_building, corporate, exhibition, other)
service_type (enum: cocktails_mocktails, smoothies, hybrid)
prepaid_serves (int) -- e.g. 1000
station_count (int)
station_layout_notes (text, nullable)
batching_instructions (text, nullable)
pre_service_prep_count (int, nullable)

-- Staff
staff_count (int)
staff_names (text[], nullable)
flair_required (boolean, default false)

-- Equipment and Setup
pop_up_bar (boolean, default false)
pop_up_bar_supplier (text, nullable)
pop_up_bar_cost (decimal, nullable)
dry_ice (boolean, default false)
equipment_template_id (FK -> equipment_templates, nullable)
menu_frame_count (int, nullable)
menu_notes (text, nullable)

-- Logistics
install_instructions (text, nullable)
parking_instructions (text, nullable)
access_route (text, nullable)
vehicle_reg (text, nullable)
vehicle_reg_deadline (date, nullable)

-- Card Payment Service
card_payment_service (boolean, default false)
card_payment_price (decimal, nullable)
card_payment_serves (int, nullable)
card_payment_commission (decimal, nullable)

-- Financial
invoice_amount (decimal)
cost_amount (decimal, nullable)
profit_amount (decimal, computed)
stock_return_policy (text, nullable)

-- LC Communication
lc_recipient (text, default "Rory")
lc_sent_at (timestamp, nullable)
lc_confirmed_at (timestamp, nullable)

-- Status and Lifecycle
status (enum: enquiry, confirmed, preparation, ready, delivered, cancelled)
notes_custom (text, nullable)
outcome_notes (text, nullable)
testimonial_requested (boolean, default false)
created_at / updated_at
created_by (FK -> users)
```

### 5.2 Event Contacts (Site Clients)

```
event_contacts
id (uuid, PK)
event_id (FK -> events)
contact_name (text)
contact_role (text) -- e.g. "FBB Manager"
contact_phone (text)
contact_email (text, nullable)
is_primary (boolean)
sort_order (int)
```

### 5.3 Event Cocktails

```
event_cocktails
id (uuid, PK)
event_id (FK -> events)
cocktail_id (FK -> cocktails)
menu_name (text) -- customer-facing name
menu_description (text) -- poetic one-liner for menu frame
station_number (int, nullable)
serves_allocated (int, nullable)
sort_order (int)
```

### 5.4 Event Glassware

```
event_glassware
id (uuid, PK)
event_id (FK -> events)
glass_type (text) -- e.g. "Polycarb rocks", "Coupe"
quantity (int)
notes (text, nullable)
sort_order (int)
```

### 5.5 Event Equipment

```
event_equipment
id (uuid, PK)
event_id (FK -> events)
equipment_template_item_id (FK, nullable)
item_name (text)
category (enum: bar_tools, service, prep_storage, consumables, personal_logistics, specialist)
quantity (int)
is_override (boolean)
notes (text, nullable)
sort_order (int)
```

### 5.6 Event Standard Notes

```
standard_notes
id (uuid, PK)
note_text (text)
category (text, nullable)
is_active (boolean)
sort_order (int)

event_standard_notes
id (uuid, PK)
event_id (FK -> events)
standard_note_id (FK -> standard_notes)
is_selected (boolean, default true)
```

### 5.7 Event Checklists

```
event_checklists
id (uuid, PK)
event_id (FK -> events)
item_type (enum: cocktail_specs, stock_list, equipment, setup_format, staff, running_order, glassware, custom)
item_label (text)
status (enum: not_started, in_progress, complete)
completed_at (timestamp, nullable)
completed_by (FK -> users, nullable)
sort_order (int)
```

### 5.8 Cocktail Recipe Library

```
cocktails
id (uuid, PK)
name (text) -- internal name
default_menu_name (text) -- default customer-facing name
default_menu_description (text) -- default poetic description
season (enum: spring, summer, autumn, winter, all_year)
glass_type (enum: rocks, coupe, highball, martini, flute, polycarb_rocks, other)
ice_amount_g (int)
ice_type (text)
straw (boolean)
straw_type (text, nullable)
category (text)
reference_image_url (text, nullable)
is_non_alcoholic (boolean, default false)
notes (text, nullable)
is_active (boolean)
created_at / updated_at

cocktail_ingredients
id (uuid, PK)
cocktail_id (FK -> cocktails)
ingredient_name (text)
ingredient_category (enum: spirit, puree, juice, syrup, citrus, modifier, foamer, soda, other)
amount (decimal)
unit (enum: ml, g, drops, dash, piece, whole, bunch, sprig)
brand (text, nullable)
is_optional (boolean)
sort_order (int)

cocktail_garnishes
id (uuid, PK)
cocktail_id (FK -> cocktails)
garnish_name (text)
garnish_category (enum: fruit, botanical, decorative, spray)
quantity (decimal)
quantity_unit (text)
sort_order (int)
```

### 5.9 Equipment Templates

Three template types: Exhibition, Corporate/Private, Smoothie.

Scaling rule: 1 bartender = 1 station = 1 kit set.

**Smoothie Equipment Template (per station):**
- 3 smoothie blenders (Specialist)
- 1 extension cable (Specialist)
- 1 four-way UK socket adaptor (Specialist)
- 3 store n pours (Prep and Storage)
- 1 fruit knife (Bar Tools)
- 1 chopping board (Bar Tools)
- Plastic garnish boxes (Prep and Storage)
- 1 ice bucket and scoop (Bar Tools)
- 1 large plastic box for ice storage under bar (Prep and Storage)
- 1 bar caddy for black napkins and black straws (Service)
- Black napkins (Consumables)
- Black straws (Consumables)
- Black bin liners (Consumables)
- Cleaning spray and blue roll (Consumables)
- 1 first aid box for plasters (Personal and Logistics)
- 1 menu holder (Service)

```
equipment_templates
id (uuid, PK)
name (text)
service_type (enum: cocktails_mocktails, smoothies, hybrid)
event_type (enum: exhibition, corporate_private)
base_staff_count (int)
staff_title (text)
notes (text, nullable)
is_active (boolean)
created_at / updated_at

equipment_template_items
id (uuid, PK)
template_id (FK -> equipment_templates)
item_name (text)
category (enum: bar_tools, service, prep_storage, consumables, personal_logistics, specialist)
base_quantity (int)
scaling_rule (enum: per_station, fixed, per_spirit, per_ingredient)
scaling_notes (text, nullable)
sort_order (int)
```

## 6. Stock Calculator

Algorithmic (no AI required). Uses cocktail recipe library to calculate exact quantities.

**Formula:**

```
For each cocktail on event menu:
  total_serves = prepaid_serves + card_payment_serves (if applicable)
  allocated_serves = serves_allocated override OR (total_serves / number_of_cocktails)
  
  For each ingredient:
    total_needed = allocated_serves x ingredient_amount_per_serve
    total_with_buffer = total_needed x 1.15 (15% wastage buffer)
    purchase_units = ceiling(total_with_buffer / unit_size)
  
  For each garnish:
    total_garnishes = allocated_serves x garnish_quantity_per_serve
    total_with_buffer = total_garnishes x 1.10 (10% garnish buffer)
```

## 7. Standard Notes Bank

Recurring instructions stored as selectable defaults:

- "Nothing visible behind the bar, no boxes sticking out, nothing to upset the client's eye"
- "Garnish carefully and impeccably, this is super important"
- "Batch up where possible and serve at pace"
- "Have [X] of each cocktail ready on the bar top at the start of service"
- "The menu in the frame needs to look beautiful, make sure the frame is super clean and presentable"
- "Spray the edible glitter when the cocktail is in the guest's hand, for theatre"
- "A polished, seamless drinks service"

## 8. Attire Default

Always the same. Hardcoded as system default:

- Black waistcoat (essential)
- Black bow tie (must be bow tie, not regular tie)
- White ironed shirt
- Smart black trousers or smart black jeans
- Polished black leather shoes, no trainers
- Arrive in serving attire, even for setup

## 9. Recipe Library: Seasonal Organisation

Cocktails organised by season (~6 per season). ~20 recipes for initial load. Each recipe stores internal name, default menu name, poetic description, full spec, reference image (reusable), and non-alcoholic flag. Menu names and descriptions can be overridden per event.

## 10. Card Payment Cocktail Service

Popular option for large venues. Toggle on/off per event with price per cocktail, additional serves count, commission per cocktail, separate stock tracking, and LC digital sales report post-event.

## 11. Success Metrics

- Brief creation time: Under 10 minutes (from 30 to 60 minutes currently)
- LC communication errors: Zero missed items
- Stock calculation accuracy: Within 5% of manual calculation
- Murdo adoption: Uses Backstage for all events within 30 days of launch
- Rory feedback: Confirms briefs are as clear and complete as manual versions

---

# Part 3: Tech Stack and Configuration

**Last Updated:** 9 April 2026

## Framework: Next.js 16.2

Backstage is built on Next.js 16.2 (latest stable, March 2026). Benefits: 400% faster dev startup, 50% faster rendering, Turbopack server fast refresh, stable React Compiler, proxy.ts pattern for WorkOS AuthKit v3.0.0.

## Core Stack

| Layer | Package | Version | Purpose |
|---|---|---|---|
| Framework | next | 16.2.x | App Router, Server Components, Server Actions |
| Runtime | React | 19.x | UI rendering |
| Language | TypeScript | 5.x | Type safety throughout |
| Styling | Tailwind CSS | v4 | CSS-first config, matches main website |
| Auth | @workos-inc/authkit-nextjs | 3.0.0 | Identity, sessions, MFA, roles, audit logs |
| Database | NeonDB (PostgreSQL) | Serverless | Shared instance with Command Centre, separate tables |
| DB Driver | @neondatabase/serverless | Latest | HTTP driver for Vercel serverless |
| ORM | drizzle-orm | Latest | Type-safe queries, ~7.4kb, schema-first |
| Migrations | drizzle-kit | Latest | Schema to SQL migration generation |
| Email | resend | Latest | "Send to LC" brief delivery, alert notifications |
| PDF | @react-pdf/renderer | Latest | Downloadable event brief PDFs |
| Hosting | Vercel | N/A | Zero-config Next.js deployment |
| Cache/Rate Limit | @upstash/redis | Latest | Auth endpoint rate limiting |

## Install Command

```bash
npx create-next-app@latest backstage --typescript --tailwind --app
cd backstage
npm install @workos-inc/authkit-nextjs@latest drizzle-orm @neondatabase/serverless resend @react-pdf/renderer @upstash/redis
npm install -D drizzle-kit
```

## Folder Structure

```
backstage/
├── proxy.ts                    # WorkOS auth proxy (Next.js 16+)
├── drizzle.config.ts           # Drizzle ORM config
├── drizzle/                    # Generated migrations
├── src/
│   ├── app/
│   │   ├── layout.tsx          # AuthKitProvider wrapper
│   │   ├── page.tsx            # Dashboard (Murdo's morning view)
│   │   ├── callback/
│   │   │   └── route.ts        # WorkOS auth callback
│   │   ├── events/
│   │   │   ├── page.tsx        # Pipeline view
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx    # Event detail
│   │   │   │   ├── checklist/  # Checklist management
│   │   │   │   ├── stock/      # Stock calculator
│   │   │   │   └── send/       # Send to LC
│   │   ├── recipes/
│   │   │   ├── page.tsx        # Recipe library
│   │   │   └── [id]/page.tsx   # Recipe detail
│   │   ├── equipment/
│   │   │   └── page.tsx        # Equipment templates
│   │   └── partner/            # Rory's restricted view
│   │       └── page.tsx
│   ├── actions/
│   │   ├── events.ts           # Event CRUD server actions
│   │   ├── checklists.ts       # Checklist server actions
│   │   ├── recipes.ts          # Recipe library actions
│   │   ├── stock.ts            # Stock calculator
│   │   └── send-to-lc.ts       # Email + PDF generation
│   ├── db/
│   │   ├── schema.ts           # Drizzle table definitions + RLS
│   │   ├── index.ts            # DB client initialisation
│   │   └── rls.ts              # withRLS wrapper function
│   ├── lib/
│   │   ├── email/              # Resend templates
│   │   └── pdf/                # React-PDF templates
│   └── components/
│       ├── ui/                 # shadcn/ui (restyled to BE brand)
│       ├── events/             # Event-specific components
│       ├── recipes/            # Recipe components
│       └── pipeline/           # Pipeline view components
├── .env.local
├── package.json
└── tsconfig.json
```

---

# Part 4: Frontend Design Document

**Last Updated:** 9 April 2026

## 1. Design Philosophy

### 1.1 Brand Alignment

Backstage inherits Bar Excellence's "Modern Luxury" aesthetic:

- **Authoritative restraint**: charcoal and cream surfaces, sharp edges (border-radius: 0), generous whitespace
- **Architectural typography**: Cormorant Garamond for headings, Raleway for everything else, light font weights on display text
- **Purposeful motion**: luxury easing (cubic-bezier(0.22, 1, 0.36, 1)), animations only where they add meaning

Backstage is a **dashboard application**, not a marketing site. This means higher information density, sidebar-based navigation, faster animations (200ms to 400ms), data tables and pipeline views instead of hero images.

### 1.2 The Luxury Dashboard Test

Before shipping any Backstage screen, ask:

- Does it feel like a tool Murdo would be proud to show a client?
- Is the information hierarchy immediately clear?
- Could Rory (non-technical) navigate this without guidance?
- Sharp edges throughout? No rounded corners on structural elements?
- No Oxford commas, no em-dashes, no exclamation marks?

## 2. Design Tokens

### 2.1 Colour Palette

| Token | Hex | Usage |
|---|---|---|
| Charcoal | #1E1F2E | Sidebar background, dark surfaces, primary text on light backgrounds |
| Cream | #FAF9F6 | Main content background, card surfaces |
| Gold | #A4731E | Primary accent, active pipeline stage, CTAs, focus rings |
| Gold Ink | #7A5416 | Text-safe gold on cream backgrounds (WCAG AA compliant) |
| Grey | #6B7280 | Muted labels, secondary text, inactive states |
| Cognac | #B8860B | Event status: confirmed |
| Botanical | #8B9D83 | Event status: delivered |
| Error | #EF4444 | Overdue checklist items, validation errors, 48-hour alerts |
| Success | #4E8A3E | Checklist complete, event delivered |
| Warning | #D78B07 | Approaching deadline, incomplete items |

### 2.2 Pipeline Stage Colours

| Stage | Colour | Token |
|---|---|---|
| Enquiry | Grey #6B7280 | grey |
| Confirmed | Cognac #B8860B | cognac |
| Preparation | Gold #A4731E | gold |
| Ready | Botanical #8B9D83 | botanical |
| Delivered | Success #4E8A3E | success |
| Cancelled | Error/muted #EF4444/20 | destructive at 20% opacity |

### 2.3 Typography

| Element | Font | Weight | Size | Tracking |
|---|---|---|---|---|
| Page titles | Cormorant Garamond | 300 (light) | text-3xl to text-5xl | tight |
| Section headings | Cormorant Garamond | 300 | text-xl to text-2xl | tight |
| Card titles | Raleway | 600 (semibold) | text-base to text-lg | normal |
| Body text | Raleway | 400 | text-sm to text-base | normal |
| Labels and overlines | Raleway | 500 (medium) | 11px | 0.18em |
| Buttons and CTAs | Raleway | 600 | 11px | 0.16em |
| Data table cells | Raleway | 400 | text-sm | normal |
| Status badges | Raleway | 500 | 10px | 0.16em |

### 2.4 Spacing

8px grid system. Page padding: px-5 md:px-8 lg:px-6. Section gaps: gap-6 md:gap-8. Card padding: p-5 md:p-6. Form field spacing: space-y-4.

### 2.5 Borders and Elevation

Sharp edges enforced globally (--radius: 0rem). No rounded corners on any structural element. Card borders: border border-foreground/10. Active/hover: border-gold/40 transitioning to border-gold. Shadows minimal, prefer border transitions.

## 3. Component Library

### 3.1 Base: shadcn/ui (restyled)

Vendored into the project. Key restyling: border-radius 0 on everything, gold accent replaces default blue/violet, Cormorant Garamond on Dialog/Sheet titles, Raleway on all body/UI text, minimum touch target 44px.

### 3.2 Core shadcn Components

Button (luxury variant), Card, Input/Textarea, Select, Badge (pipeline stage colours), DataTable (TanStack Table v8), Sheet (side panel), Dialog, Sidebar (collapsible, charcoal), Tabs, Checkbox, Skeleton, Command (Cmd+K).

### 3.3 Custom Components

- **PipelineBoard**: Kanban with drag-and-drop (@hello-pangea/dnd)
- **EventCard**: Pipeline card with event name, date, venue, guest count, readiness indicator
- **ChecklistPanel**: Collapsible checklist with per-item status
- **StockCalculator**: Read-only calculated view with ingredient breakdown
- **RecipeCard**: Recipe library card with reference image, cocktail name, season badge
- **EquipmentTemplate**: Selectable equipment list with quantity overrides
- **BriefPreview**: Full event brief preview matching "Send to LC" output
- **ReadinessIndicator**: Colour-coded dot (green/amber/red)
- **TimelineBar**: Horizontal bar showing arrive, setup, service start, service end, depart

## 4. Layout Architecture

### 4.1 Shell Layout

Sidebar + content area. Sidebar persistent on desktop, collapses to sheet on mobile.

```
+------------------+----------------------------------------+
|                  |  Top Bar (user, notifications, Cmd+K)  |
|    Sidebar       +----------------------------------------+
|    (charcoal)    |                                        |
|                  |  Content Area (cream background)       |
|  - Dashboard     |                                        |
|  - Events        |  [Page content rendered here]          |
|  - Recipes       |                                        |
|  - Equipment     |                                        |
|  - Settings      |                                        |
|                  |                                        |
+------------------+----------------------------------------+
```

**Murdo's sidebar:** Dashboard, Events, Recipes, Equipment, Settings
**Rory's sidebar:** Events (confirmed+ only), Recipes (read-only), Equipment (read-only)

### 4.2 Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 768px | Sidebar hidden (sheet on hamburger), single column |
| Tablet | 768px to 1023px | Sidebar collapsed (icons only) |
| Desktop | 1024px+ | Sidebar expanded, content with max-width |

## 5. Page Designs

### 5.1 Dashboard (Murdo only)

Morning overview. 2-column grid on desktop, stacked on mobile. Cards: Today's Events (with readiness indicator), Upcoming This Week, Overdue Checklist Items (red), Revenue Snapshot (gold progress bar), Alerts (48-hour warnings). Page title: "Good morning, Murdo" in Cormorant Garamond light.

### 5.2 Events Pipeline

Two views via toggle:

**Kanban (default):** 6 columns (Enquiry, Confirmed, Preparation, Ready, Delivered, Cancelled). Draggable event cards. Column headers show count and colour indicator. Stage colour top border (2px).

**List View:** DataTable with sorting, filtering, pagination. Columns: Event Name, Date, Venue, Guests, Status badge, Readiness, LC Sent. Row click opens detail.

### 5.3 Event Detail

Full page with tabbed interface:

1. **Overview**: Name, show name, dates, times (timeline bar), venue, contacts, staff, logistics
2. **Cocktails and Stock**: Selected cocktails, auto-calculated stock list, glassware
3. **Equipment**: Auto-populated from template, editable quantities
4. **Checklist**: All preparation items with status toggles
5. **Notes**: Standard notes bank (checkboxes) plus custom free-text
6. **Brief Preview**: Full rendered preview of the "Send to LC" output
7. **Financials** (Murdo only, hidden from Rory): Invoice, costs, profit, card payment details, commission

Top bar: Event name (Cormorant Garamond light), status badge, "Send to LC" button (luxury variant, gold), Edit/Cancel actions.

### 5.4 Recipe Library

Grid of recipe cards filtered by season and type. Card: reference image (4:3), cocktail name, season badge, non-alcoholic indicator. Ken Burns hover effect. Detail: full-width image, menu name/description (Cormorant Garamond italic), full spec, garnish list, glass/ice type.

### 5.5 Equipment Templates

List of templates (Exhibition, Corporate/Private, Smoothie) with expandable item lists grouped by category. Editable quantities when in event context.

### 5.6 Partner View (Rory)

Simplified Events Pipeline and Event Detail. Sees confirmed+ events only. No Dashboard, Settings, Financial tab, drag-and-drop, or edit capabilities. "Sent by Murdo" timestamp visible.

### 5.7 Quick Capture (Mobile, Murdo only)

Square FAB (gold background, charcoal plus icon, sharp edges). Bottom sheet with rapid data entry: add enquiry, log quick note, mark checklist item complete. Target: 30 seconds per capture.

## 6. Interaction Patterns

| Interaction | Duration | Easing |
|---|---|---|
| Hover states | 200ms | ease-luxury |
| Tab switching | 300ms | ease-luxury |
| Side panel open | 400ms | ease-luxury |
| Pipeline card drag | Real-time | Spring physics |
| Status badge change | 350ms | ease-luxury |
| Checklist toggle | 200ms | ease-luxury |
| Page transitions | 300ms | ease-decelerate |
| Bottom sheet (mobile) | 400ms | ease-luxury |

Loading: React Suspense + shadcn Skeleton. Empty states: calm, factual ("No events at this stage"). Error states: factual, not apologetic.

## 7. "Send to LC" Brief Output Design

**Email:** Clean HTML via Resend + React Email. Charcoal header with BE logo, gold-ink section headings on cream, Raleway body text, sharp edges, cocktail reference images inline, Murdo's contact details footer.

**PDF:** @react-pdf/renderer, A4 portrait, Liberation Serif/Sans fonts, mirrors 15-section brief structure.

## 8. Copy and Tone

All UI copy: authoritative, refined, measured.

- "Event confirmed" not "Your event has been confirmed."
- "Send to LC" not "Send Event Brief to Liquor Collective"
- No exclamation marks, no Oxford commas, no em-dashes
- Button labels: uppercase, tracking-[0.16em], max 3 words (SEND TO LC, ADD EVENT, SAVE CHANGES, VIEW BRIEF, GENERATE STOCK)

## 9. Accessibility

Min 44px touch targets. focus-visible only. Gold focus rings. Gold-ink for text on cream (WCAG AA). Reduced motion support. ARIA labels on all interactive elements.

## 10. Dark Mode

Default: dark mode (charcoal-first). Toggle in Settings, persisted via cookie. Gold accent maintained in both modes.
