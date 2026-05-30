# Launch Readiness — Backstage

**Status as of 2026-05-30:** Engineering essentially complete. Build green, unit tests green,
13 e2e specs green. The critical path to "Murdo can use this for a real event" is mostly
**non-code** (content + production setup + one live email test) plus **one design decision**
(gold contrast).

This is the ordered launch gate. Granular design debt lives in `TODOS.md`; the gap analysis
behind it lives in `docs/plans/2026-05-18-event-sheet-gap-report.md`.

**Owner key:** 🧑‍🍳 Murdo (content/business input) · 🛠️ Rob (engineering/ops) · ⚖️ Decision needed

---

## 🔴 Launch blockers — must clear before Murdo uses it live

1. **🧑‍🍳 Remaining cocktail recipes** — 6 of ~20 seeded. The stock calculator is only as
   accurate as the recipe data. Collect the remaining ~14 (name, ingredients with exact
   measurements, garnishes) from Murdo and seed them.
   _Blocks: accurate stock lists on any event using an un-seeded cocktail._

2. **🛠️ Production environment + accounts** — provision in prod (Vercel):
   - Required env: `DATABASE_URL`, `MAGIC_LINK_SECRET`, `SESSION_SECRET`, `RESEND_API_KEY`,
     `FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`.
   - Confirm `ENABLE_TEST_AUTH` is **unset** in production (the test-signin route already
     self-blocks on `VERCEL_ENV=production`, but belt-and-braces).
   - Create real magic-link accounts for Murdo (owner), Rob (super_admin), Rory (partner).
   _Blocks: anyone logging in to the real instance._

3. **🛠️ Live email send verification** — exercise Send-to-LC → Resend → real inbox once,
   with a verified `from` domain. Confirm the brief email renders in Gmail/Outlook (dark
   charcoal header, gold section titles). Not automatable in CI; currently unchecked in
   `TODOS.md` Manual QA.
   _Blocks: trusting the core "send brief to LC" action in production._

---

## ⚖️ Engineering decision — the one real code decision left

4. **⚖️🛠️ Brand-colour contrast (WCAG AA)** — the gold `#A4731E` fails AA (~3.95:1) on ~10–20
   primary buttons and section-heading labels. The axe `color-contrast` rule is currently
   **disabled** in `e2e/accessibility.spec.ts` to keep the suite green, so this is a known
   silenced issue. Pick one and implement, then re-enable the rule:
   - (a) darken the gold token (`gold-ink #7A5416` already exists, tests ~5.4:1), or
   - (b) switch button text from cream → charcoal, or
   - (c) bump heading sizes to qualify as AA-Large (3:1), or
   - (d) formally accept AA-Large for accents and document it in the design system.

   _Detail: `TODOS.md` → "Design system: brand-colour contrast"._

---

## 🟡 Pre-launch QA — human run-throughs (not automatable)

5. **🛠️ VoiceOver spot check** — landmarks, headings, button labels. Needs a Mac + screen reader.
6. **🛠️ Visual review punch-list** — walk the seeded Heathrow + Glasgow briefs in the dev
   server and confirm the ~10 🔍 items at the foot of
   `docs/plans/2026-05-18-event-sheet-gap-report.md` (address wrapping at mobile, react-pdf
   line-breaks, stock-list pagination, equipment row breaks, standard-notes checkboxes, status
   badge colours). Code analysis can't determine rendered output for these.

---

## ❓ Content questions for Murdo (confirm before further seeding)

7. **🧑‍🍳 Source-PDF recipe discrepancies** (preserved deliberately, pending confirmation):
   - "Cloudy apple" in Springtime Clover Club / Wellingtons Gin Club menu copy — no apple
     juice in the recipe.
   - "Orange blossom" in Clockwork Orange Margarita menu copy — not in the spec (agave + OJ).
   - Clydeport Celebration — Gomme flagged "(check)" in source, seeded at 10ml.

---

## ⚪ Explicitly deferred — NOT launch concerns

Confirmed post-launch / out-of-scope in `docs/design-doc.md` and the gap report; listed so
they aren't mistaken for gaps:

- PDF per-image width cap (only matters once cocktail images are added to PDFs)
- Dark mode toggle · Quick-capture FAB · Revenue analytics · Testimonial-request automation
- Dashboard CSV/PDF export · In-app event commenting · Email digests / push notifications
- Card-payment service tracking UI (schema fields exist; no UI yet)

---

## Reference: what's already DONE

The May 18 gap report logged **14 data-fidelity blockers** against Murdo's real event sheets.
All have shipped via Specs A–K (see `CLAUDE.md` spec sections + git history): stock-list
completeness (`event_stock`), standard-notes/attire reaching LC, workaround-token stripping,
host visibility, pop-up-bar branding, pre-pour batching, structured multi-line address,
per-cocktail ice/straw display, `per_guest` scaling, and the unified partner/owner dashboard
(two security-hardening passes on partner financial isolation). Core loop is feature-complete
and tested.
