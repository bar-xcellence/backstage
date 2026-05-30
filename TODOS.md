# TODOS — Backstage

> **Launch gate:** the ordered, owner-tagged punch-list lives in
> [`docs/launch-readiness.md`](docs/launch-readiness.md). This file holds the granular detail.

All Phases 1–3 code is implemented on `main`. The items below are the remaining launch blockers and quality tasks.

---

## Content

### Get Murdo's cocktail recipes ✓ partial (6 of ~20)
**What:** Collect ~20 cocktail recipes in spreadsheet format (name, ingredients with exact measurements, garnishes). Replace the seeded placeholder cocktails.
**Why:** Stock calculator depends on accurate recipe data.
**Status:** 6 real recipes seeded from Heathrow + Glasgow PDFs (Spiced Passionstar, Springtime Clover Club, Clydeport Celebration, Barrowlands Stars, Wellingtons Gin Club, Clockwork Orange Margarita). Placeholder cocktails removed. ~14 more recipes still pending from Murdo.
**Added:** 2026-04-16
**Updated:** 2026-05-18

---

## Code Quality / Future

### PDF memory limit hardening (image cap)
**What:** The PDF route now has a text-only fallback for full render failures. The remaining TODO from the spec is capping individual cocktail image widths to 800px max before passing to the renderer, to reduce peak memory usage.
**Why:** Proactive protection against serverless memory limits before images are added to PDFs.
**Status:** Text-only fallback is now shipped. Image cap is a future improvement when cocktail images are added to the PDF template.

---

## Manual QA (pre-launch)

E2E coverage (Playwright, `npm run test:e2e`) now covers the partner role boundary, the owner happy path through event creation, responsive breakpoints, keyboard navigation, axe audit (with documented brand-colour exception below), and PDF download. The items below still need a human run-through.

- [x] Responsive breakpoints: mobile top bar, tablet icon-only sidebar, desktop full sidebar — covered by `e2e/responsive.spec.ts` (3 viewports × dashboard + event detail, no-horizontal-scroll assertion + layout chrome at each)
- [x] Keyboard-only navigation: all interactive elements reachable and operable — covered by `e2e/keyboard-nav.spec.ts` (Tab traversal, form-field reachability, visible focus indicator)
- [ ] VoiceOver spot check: landmarks, headings, button labels — needs a Mac + screen reader; not automatable
- [x] axe audit: no critical or serious violations — covered by `e2e/accessibility.spec.ts` on signin / owner+partner dashboards / events list / event detail (both roles) / settings. All rules enforced including color-contrast (migration complete, see follow-up below).
- [x] Owner PDF download: server returns a valid `%PDF-` for owner + partner — covered by `e2e/owner-pdf-download.spec.ts`
- [ ] Owner/super_admin actual email send: Send to LC → verify message lands in inbox (requires real Resend setup, not automatable in CI)
- [x] Partner flow: only confirmed+ events visible, event detail loads without errors, no edit/checklist/actions shown, no financial fields — covered by `e2e/partner-read-only.spec.ts`

---

## Design system: brand-colour contrast (follow-up)

**What:** Resolve WCAG AA contrast failures on the Reserve Noir gold-accent treatments. axe-core flags:

- `bg-gold text-cream` primary buttons (e.g. SIGN IN, ADD EVENT, save buttons) — contrast 3.95:1 on `#FAF9F6` against AA's 4.5:1 (passes AA Large at 3:1 if the type is bumped to 18pt+ or 14pt+ bold)
- `text-gold` section-heading labels on `bg-cream` / `bg-surface-low` (e.g. "MAY 2026 · 1 event" eyebrow, "Elements", "LC Payout", "Invoice", "Cost", "Margin") — same ~3.95–3.75:1
- `text-gold` Cancelled chip border + label — same

**Why:** The gold (`#A4731E`) is the brand accent and is used in ~10–20 places. Resolving needs a product/brand decision — options include (a) darken the gold token (e.g. to `gold-ink` `#7A5416` which already exists and tests at ~5.4:1), (b) switch button text from cream to charcoal, (c) bump heading sizes to qualify as AA Large, or (d) accept the AA Large standard for accents and update the design system spec.

**Status:** RESOLVED 2026-05-30 — gold text/fills migrated to `gold-ink` on light
surfaces; dark-surface nav labels to cream; bright gold retained for non-text accents.
The axe `color-contrast` rule is re-enabled in `e2e/accessibility.spec.ts`. See
`docs/superpowers/plans/2026-05-30-gold-contrast-aa-fix.md`.

**Added:** 2026-05-25
