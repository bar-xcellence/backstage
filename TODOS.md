# TODOS — Backstage

## Setup Prerequisites (before Phase 1)

### Create GitHub repo (bar-xcellence/backstage)
**What:** Initialise git, create repo on GitHub under bar-xcellence org, set up Vercel project linkage.
**Why:** No code can be deployed without a repo. Vercel auto-deploy depends on this.
**Depends on:** GitHub org access for bar-xcellence.
**Added:** 2026-04-16 via /plan-eng-review

### Resolve Resend domain verification for bar-excellence.app
**What:** Add SPF, DKIM, DMARC DNS records for bar-excellence.app in Resend dashboard.
**Why:** Magic link emails and Send to LC emails need to come from bar-excellence.app for brand credibility and deliverability. Without verification, emails may land in spam.
**Depends on:** DNS access for bar-excellence.app.
**Added:** 2026-04-16 via /plan-eng-review

### Get Murdo's cocktail recipes
**What:** Collect ~20 cocktail recipes in spreadsheet format (name, ingredients with exact measurements, garnishes).
**Why:** Stock calculator depends on accurate recipe data. Fallback: seed with well-known cocktails (Espresso Martini, Negroni, Mojito, etc.) and replace later.
**Depends on:** Murdo providing the data.
**Added:** 2026-04-16 via /office-hours

## Phase 1 Implementation

### Send to LC brief preview slide-over
**What:** Add a slide-over panel that shows a formatted preview of the brief (event details, cocktails, stock list) when Murdo clicks "Send to LC." Big "CONFIRM & SEND" button at the bottom. Uses glass-texture overlay (#1E1F2E 85% opacity, 20px blur).
**Why:** This is the highest-stakes moment in the app — the feature that replaces 30-60 minutes of manual work. A preview gives Murdo a last-look safety net before dispatch, building trust at the pixel level. Designed for "tired Murdo at 11pm."
**Depends on:** Existing Send to LC implementation.
**Added:** 2026-04-16 via /plan-design-review

### Retrofit accessibility into Phase 1 components
**What:** Add ARIA landmarks (`<nav aria-label="Main navigation">`, `<main>`, `<aside>`), skip-nav link (visually hidden, appears on focus), keyboard focus management for EventTabs (arrow keys between tabs), and focus-visible rings (2px gold, offset 2px) to all interactive elements.
**Why:** Current Phase 1 code has no accessibility support. While there are only 3 known users, a11y is good engineering practice and the plan now specifies these patterns for Phase 2-3. Retrofitting Phase 1 ensures consistency.
**Depends on:** None (can be done alongside Phase 2).
**Added:** 2026-04-16 via /plan-design-review

### Responsive sidebar and mobile top bar
**What:** Implement collapsible sidebar: below 768px, sidebar hidden, replaced by top bar (56px, charcoal bg, hamburger + brand + avatar). Sidebar opens as glass-texture overlay sliding from left. Tablet (768-1023px): sidebar collapses to icon-only (64px). Content area adjusts to full-width on mobile with 16px horizontal padding.
**Why:** Murdo uses Backstage at venues during setup — potentially on phone or tablet. Current fixed 256px sidebar eats half the mobile screen.
**Depends on:** None (can be done alongside Phase 2).
**Added:** 2026-04-16 via /plan-design-review

### PDF memory limit protection
**What:** Add try/catch around PDF generation, cap image resolution (800px max width), fall back to text-only PDF if memory issues.
**Why:** @react-pdf/renderer in Vercel serverless could hit 1024MB limit on large briefs with many cocktail images. Email is the primary delivery (decoupled per eng review Issue 3B), so PDF failure shouldn't block the feature.
**Depends on:** Phase 1 PDF implementation.
**Added:** 2026-04-16 via /plan-eng-review
