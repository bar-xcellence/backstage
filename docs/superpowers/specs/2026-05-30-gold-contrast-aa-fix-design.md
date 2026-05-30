# Gold Contrast AA Fix — Design

**Date:** 2026-05-30
**Status:** Approved (brainstorm), pending implementation plan
**Related:** `TODOS.md` → "Design system: brand-colour contrast"; `docs/launch-readiness.md` item 4

## Problem

The Reserve Noir brand accent gold `#A4731E` (`--color-gold`) fails WCAG AA (4.5:1) wherever
it carries small text:

- `bg-gold text-cream` primary buttons (SIGN IN, ADD EVENT, save buttons) — **3.95:1**
- `text-gold` eyebrow / section labels on light surfaces (MAY 2026 eyebrow, LC Payout, Invoice,
  Cost, Margin, Elements) — **~3.8:1**
- `text-gold` Cancelled chip label + border

`#A4731E` is a mid-tone (relative luminance ≈ 0.20), so it cannot reach 4.5:1 against **either**
cream or charcoal text — neither darkening nor lightening the text colour rescues it. The only
gold that passes is the deeper `gold-ink` `#7A5416` (≈ 6.4:1 on cream), which **already exists**
as `--color-gold-ink` and is already used for body text (25 `text-gold-ink`, 18 `bg-gold-ink`
occurrences). The fix is therefore finishing a migration that is already underway, not inventing
a new colour.

The axe-core `color-contrast` rule is currently **disabled** in `e2e/accessibility.spec.ts`
(`DISABLED_RULES = ["color-contrast"]`) to keep the suite green, so this violation is silenced
rather than caught.

## Decision

Adopt **option B (gold-ink)** from the visual brainstorm: deepen the failing text and button
fills to `gold-ink`, keep bright gold for non-text accents, and re-enable the axe rule so the
suite enforces the result.

## The rule — context-aware, by background

A blind `text-gold → text-gold-ink` find-and-replace is **wrong** because gold text appears on
both light and dark backgrounds, and gold-ink only helps on light ones.

### 1. Gold carrying text on LIGHT surfaces → `gold-ink` `#7A5416`

Surfaces: cream `#FAF9F6`, surface-low `#F4F3F1`, surface-high `#E3E2E0`.

- Button fills: `bg-gold` → `bg-gold-ink` (text-bearing buttons; keep `text-cream`)
- Eyebrow / section labels: `text-gold` → `text-gold-ink`
- Cancelled chip: label colour + border → `gold-ink`

All land ≈ 6.4:1 — comfortably past AA.

### 2. Gold on DARK surfaces (charcoal sidebar) → keep bright, carry gold in the non-text accent

The sidebar active nav is `bg-gold/10 text-gold border-l-2 border-gold` on charcoal `#1E1F2E`.
Bright gold text there is ≈ 3.8:1, and `gold-ink` would be **worse** (darker on dark). Re-enabling
the axe rule would otherwise turn this into a *new* violation.

Fix: the active nav **label** becomes a readable light colour (e.g. `text-cream`), while the
**gold identity is carried by the left border + the 10% gold tint**, both of which are non-text
and AA-exempt. Visually near-identical; passes AA.

### 3. Stays bright gold `#A4731E` — unchanged

AA's 4.5:1 text rule does not govern these (they fall under the 3:1 non-text rule, which axe's
`color-contrast` does not flag):

- Focus ring: `outline: 2px solid var(--color-gold)`
- `border-gold` dividers / outlines (~48 uses)
- Hover-only states (`hover:text-gold`): axe scans the resting state, not `:hover`, so these do
  not fail. Left bright for visual consistency.

## Non-goals

- Not changing the `--color-gold` hex — bright gold stays the brand accent for non-text.
- No new colour tokens — `gold-ink` already exists.
- Not restyling anything that already passes AA.
- Not migrating `hover:text-gold` states (resting state only is scanned).

## Verification — close the loop

1. Remove `"color-contrast"` from `DISABLED_RULES` in `e2e/accessibility.spec.ts`, so the suite
   **enforces** contrast instead of silencing it.
2. The axe spec runs across all currently-scanned pages: signin, owner + partner dashboards,
   events list, event detail (both roles), settings. Acceptance: **zero `color-contrast`
   violations** on every scanned page.
3. Update the explanatory comment in `e2e/accessibility.spec.ts` (it currently says the rule is
   disabled pending a design-system review — that review is now resolved).
4. Update the `globals.css` colour-token comment and the design-system note so the gold-ink-for-
   text / bright-gold-for-accents rule is documented, not folklore.

## Affected areas (for the implementation plan to enumerate per file)

- Buttons: `app/auth/signin/page.tsx`, dashboard/event/settings save + action buttons
- Labels: dashboard (`month-header`, `event-card`, `summary-strip`, `status-badge`,
  `status-chips`), event detail `page.tsx`, recipes pages, brief-preview / recipients-panel
- Cancelled chip: `status-badge.tsx` / `status-chips.tsx`
- Sidebar special case: `components/layout/sidebar.tsx` active-nav state
- Test: `e2e/accessibility.spec.ts`
- Docs: `src/app/globals.css` comment, design-system note

The exact file/line list is the implementation plan's job; this spec fixes the rule and the
acceptance criteria.

## Success criteria

- Every previously-failing surface renders in `gold-ink` (light bg) or readable light text
  (dark bg) and meets AA 4.5:1.
- Bright gold remains on focus ring + borders.
- `color-contrast` is re-enabled in the axe spec and the full e2e accessibility suite passes.
- `npm run build` and `npm run test -- --run` stay green.

## Outcome (2026-05-30)

Gold migration complete and verified: every gold text/fill is `gold-ink` on light surfaces (or
`cream` on dark), bright gold remains only on non-text accents, build + 220 unit tests green,
and the **dashboards pass axe with `color-contrast` on**.

The third success criterion was only **partially** met: re-enabling the rule fully revealed
**pre-existing non-gold palette debt** (semantic status pills, 10px semantic labels, faded
greys) that the rule had been masking — beyond this spec's gold scope and requiring their own
brand-token decisions. By decision, the gold work lands now and `color-contrast` stays disabled
until the follow-up resolves the rest. See
`docs/superpowers/specs/2026-05-30-palette-contrast-followup-design.md`.
