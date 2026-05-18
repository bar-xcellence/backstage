# TODOS — Backstage

All Phases 1–3 code is implemented on `main`. The items below are the remaining launch blockers and quality tasks.

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

E2E coverage (Playwright, `npm run test:e2e`) now covers the partner role boundary and the owner happy path through event creation. The items below still need a human run-through.

- [ ] Responsive breakpoints: mobile top bar, tablet icon-only sidebar, desktop full sidebar
- [ ] Keyboard-only navigation: all interactive elements reachable and operable
- [ ] VoiceOver spot check: landmarks, headings, button labels
- [ ] axe audit: no critical or serious violations
- [ ] Owner/super_admin full flow: create event → add cocktails → view stock → Send to LC (actual email send) → download PDF (E2E covers create + Send-to-LC button visibility but not the email send or PDF render)
- [x] Partner flow: only confirmed+ events visible, event detail loads without errors, no edit/checklist/actions shown, no financial fields — covered by `e2e/partner-read-only.spec.ts`
