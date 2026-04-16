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

### PDF memory limit protection
**What:** Add try/catch around PDF generation, cap image resolution (800px max width), fall back to text-only PDF if memory issues.
**Why:** @react-pdf/renderer in Vercel serverless could hit 1024MB limit on large briefs with many cocktail images. Email is the primary delivery (decoupled per eng review Issue 3B), so PDF failure shouldn't block the feature.
**Depends on:** Phase 1 PDF implementation.
**Added:** 2026-04-16 via /plan-eng-review
