# TODOS — Backstage

All Phases 1–3 code is implemented on `main`. The items below are the remaining launch blockers and quality tasks.

---

## Operational Launch Blockers

### Create GitHub repo (bar-xcellence/backstage)
**What:** Confirm the repo is created under the bar-xcellence org and Vercel project linkage is in place.
**Why:** Vercel auto-deploy depends on this.
**Depends on:** GitHub org access for bar-xcellence.
**Added:** 2026-04-16

### Resolve Resend domain verification for bar-excellence.app
**What:** Add SPF, DKIM, DMARC DNS records for bar-excellence.app in Resend dashboard. Remove the `barxcellence@gmail.com` Resend test address from `src/lib/auth-config.ts` once done.
**Why:** Magic link and Send to LC emails must come from bar-excellence.app for brand credibility and deliverability.
**Depends on:** DNS access for bar-excellence.app.
**Added:** 2026-04-16

---

## Content

### Get Murdo's cocktail recipes
**What:** Collect ~20 cocktail recipes in spreadsheet format (name, ingredients with exact measurements, garnishes). Replace the seeded placeholder cocktails.
**Why:** Stock calculator depends on accurate recipe data.
**Depends on:** Murdo providing the data.
**Added:** 2026-04-16

---

## Code Quality / Future

### PDF memory limit hardening (image cap)
**What:** The PDF route now has a text-only fallback for full render failures. The remaining TODO from the spec is capping individual cocktail image widths to 800px max before passing to the renderer, to reduce peak memory usage.
**Why:** Proactive protection against serverless memory limits before images are added to PDFs.
**Status:** Text-only fallback is now shipped. Image cap is a future improvement when cocktail images are added to the PDF template.

---

## Manual QA (pre-launch)

- [ ] Responsive breakpoints: mobile top bar, tablet icon-only sidebar, desktop full sidebar
- [ ] Keyboard-only navigation: all interactive elements reachable and operable
- [ ] VoiceOver spot check: landmarks, headings, button labels
- [ ] axe audit: no critical or serious violations
- [ ] Owner/super_admin flow: create event → add cocktails → view stock → Send to LC → download PDF
- [ ] Partner flow: only confirmed+ events visible, event detail loads without errors, no edit/checklist/actions shown, no financial fields
