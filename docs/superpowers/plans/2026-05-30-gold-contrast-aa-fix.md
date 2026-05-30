# Gold Contrast AA Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every gold-on-text surface meet WCAG AA (4.5:1) by deepening failing `text-gold`/`bg-gold` to the existing `gold-ink` on light surfaces (and to readable light text on dark surfaces), then re-enable axe's `color-contrast` rule so the suite enforces it.

**Architecture:** A token-usage migration, not a token change. `--color-gold` (`#A4731E`) and `--color-gold-ink` (`#7A5416`) both already exist. We move text/button-fill uses of bright gold to gold-ink, keep bright gold for non-text accents (focus ring, borders, decorative dots, hover states), and special-case the charcoal sidebar/mobile nav (gold can't darken on dark — the label goes light, the gold identity stays in the border/tint). The authoritative "done" gate is two source greps plus the re-enabled axe e2e scan.

**Tech Stack:** Next.js / React / Tailwind v4 (class tokens defined in `src/app/globals.css`), Playwright + `@axe-core/playwright` for the contrast scan, Vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-05-30-gold-contrast-aa-fix-design.md`

---

## Background: the three transforms

1. **Light-surface text** (`text-gold` resting, on cream/surface) → `text-gold-ink`.
2. **Light-surface fills** — the primary-button pattern is uniformly `bg-gold text-cream … hover:bg-gold-ink` (resting bright = the failure). Swap to `bg-gold-ink text-cream … hover:bg-gold` via two repo-wide string replacements.
3. **Dark-surface** (charcoal sidebar/mobile nav, where gold-ink would be *worse*) → label becomes `text-cream`; keep `bg-gold/NN` tint + `border-gold` as the gold accent.

**Stays bright gold `#A4731E` (do NOT touch):** focus ring (`globals.css`), all `border-gold*`, the decorative dot (`dashboard-client.tsx` `w-2 h-2 bg-gold`), `bg-gold/5` kanban drop-zone, all `hover:text-gold` / `hover:bg-gold` states (axe scans the resting state, not `:hover`), and input `focus:border-gold`.

## The "done" gate (used by several tasks)

Two source greps define completeness. **Both must return zero lines** when the migration is complete:

```bash
# A) No resting text-gold left (hover-only links are allowed):
grep -rnP '(?<!-)\btext-gold\b(?!-)' src --include='*.tsx' | grep -vE 'hover:text-gold'
# Expect: (no output)

# B) No resting solid bg-gold left (decorative dot + hover fills allowed):
grep -rnP '(?<!-)\bbg-gold\b(?![-/])' src --include='*.tsx' | grep -vE 'hover:bg-gold|w-2 h-2 bg-gold'
# Expect: (no output)
```

(`\b(?!-)` excludes `gold-ink`; `(?![-/])` excludes `bg-gold-ink` and `bg-gold/NN` tints.)

---

## Task 1: Branch + re-enable the contrast rule (the failing test)

**Files:**
- Modify: `e2e/accessibility.spec.ts:20-29`

- [ ] **Step 1: Create the working branch**

```bash
git checkout main && git pull
git checkout -b fix/gold-contrast-aa
```

- [ ] **Step 2: Re-enable `color-contrast` and rewrite the stale comment**

In `e2e/accessibility.spec.ts`, replace the comment block at lines 20-27 and the constant at line 29.

Replace this:

```ts
// `color-contrast` is disabled here pending a design-system review of the
// Reserve Noir palette. The brand-defined gold accents (`bg-gold text-cream`
// primary buttons, `text-gold` section headings on cream) test at ~3.95:1
// against WCAG AA's 4.5:1 threshold — passes AA Large (3:1 for 18pt+ or 14pt
// bold) but not AA Normal. Resolving this is a brand decision (darker gold,
// charcoal text on gold, larger headings, etc.) outside QA scope. Tracked in
// TODOS.md. Every other axe rule remains active so this scan still catches
// landmarks, labels, ARIA, focus order, heading hierarchy, etc.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const DISABLED_RULES = ["color-contrast"];
```

With this:

```ts
// All WCAG 2.1 A/AA rules are enforced, including `color-contrast`. The
// Reserve Noir gold accents were migrated to `gold-ink` (#7A5416) for text
// and button fills (see docs/superpowers/specs/2026-05-30-gold-contrast-aa-fix-design.md);
// bright gold (#A4731E) remains only on non-text accents (focus ring, borders).
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const DISABLED_RULES: string[] = [];
```

- [ ] **Step 3: Run the scan to confirm it now fails (RED)**

```bash
npm run test:e2e -- accessibility.spec.ts
```

Expected: one or more tests FAIL with `color-contrast` violations listed (e.g. ADD EVENT button, gold eyebrow labels). This is the failing test that the rest of the plan turns green.

- [ ] **Step 4: Commit**

```bash
git add e2e/accessibility.spec.ts
git commit -m "test(a11y): re-enable axe color-contrast rule (RED before gold-ink migration)"
```

---

## Task 2: Light-surface fills — primary buttons + selected/badge fills

Every solid gold fill that carries text uses `bg-gold text-cream`. The primary-button variant also has `hover:bg-gold-ink`. Two repo-wide replacements fix all of them at once and are safe because these exact substrings only occur on these elements.

**Files (all under `src/`, modified by the global replaces):** `app/auth/signin/page.tsx`, `components/events/send-to-lc-button.tsx`, `event-form.tsx`, `event-equipment.tsx`, `event-data-table.tsx`, `event-checklist.tsx`, `events-view.tsx`, `brief-preview.tsx`, `components/dashboard/dashboard-client.tsx`, `status-badge.tsx`, `components/settings/lc-recipients-section.tsx`, `from-address-section.tsx`, `app/(authenticated)/recipes/page.tsx`, `components/events/view-toggle.tsx`.

- [ ] **Step 1: Swap resting fill bright→ink (every `bg-gold text-cream`)**

Run:

```bash
grep -rl 'bg-gold text-cream' src --include='*.tsx' | xargs sed -i '' 's/bg-gold text-cream/bg-gold-ink text-cream/g'
```

(macOS `sed -i ''`. On Linux use `sed -i`.)

- [ ] **Step 2: Swap the button hover bright (so hover still changes state, now ink→bright)**

Run:

```bash
grep -rl 'hover:bg-gold-ink' src --include='*.tsx' | xargs sed -i '' 's/hover:bg-gold-ink/hover:bg-gold/g'
```

- [ ] **Step 3: Verify no resting solid `bg-gold` remains except the allowlist**

```bash
grep -rnP '(?<!-)\bbg-gold\b(?![-/])' src --include='*.tsx' | grep -vE 'hover:bg-gold|w-2 h-2 bg-gold'
```

Expected: no output. (The only remaining bare `bg-gold` are the decorative dot in `dashboard-client.tsx` and ghost-button `hover:bg-gold` fills.)

- [ ] **Step 4: Build to confirm classes still compile**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(a11y): deepen gold button + selected fills to gold-ink (resting), bright on hover"
```

---

## Task 3: Dark-surface nav — light label, keep gold border/tint

On charcoal, gold-ink would be darker-on-dark (worse). The label goes `text-cream`; the gold identity stays in the existing `bg-gold/NN` tint + `border-gold`.

**Files:**
- Modify: `src/components/layout/sidebar.tsx:73`
- Modify: `src/components/layout/mobile-top-bar.tsx:195`
- Modify: `src/components/layout/mobile-top-bar.tsx:150`

- [ ] **Step 1: Sidebar active nav item**

In `src/components/layout/sidebar.tsx:73`, change:

```tsx
                    ? "bg-gold/10 text-gold border-l-2 border-gold"
```

to:

```tsx
                    ? "bg-gold/10 text-cream border-l-2 border-gold"
```

- [ ] **Step 2: Mobile menu active nav item**

In `src/components/layout/mobile-top-bar.tsx:195`, change:

```tsx
                          ? "bg-gold/10 text-gold border-l-2 border-gold"
```

to:

```tsx
                          ? "bg-gold/10 text-cream border-l-2 border-gold"
```

- [ ] **Step 3: Mobile avatar initials (on the charcoal top bar)**

In `src/components/layout/mobile-top-bar.tsx:150`, change:

```tsx
            className="w-9 h-9 bg-gold/20 text-gold flex items-center justify-center font-[family-name:var(--font-raleway)] text-xs font-medium tracking-[0.1em] uppercase"
```

to (only `text-gold` → `text-cream`):

```tsx
            className="w-9 h-9 bg-gold/20 text-cream flex items-center justify-center font-[family-name:var(--font-raleway)] text-xs font-medium tracking-[0.1em] uppercase"
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx src/components/layout/mobile-top-bar.tsx
git commit -m "fix(a11y): dark-surface nav labels to cream, keep gold border/tint accent"
```

---

## Task 4: Provisional / enquiry muted badge

The `provisional` (partner) and `enquiry` (owner) badges use `text-gold opacity-60`. At 60% opacity *no* colour can reach 4.5:1, so the opacity must go. Keep the muted character via the thin `border-gold/60` and switch the label to `text-gold-ink`.

> Note: this is a deliberate, documented deviation from the PRD's literal "60% opacity" muted treatment — the thin border + eyebrow styling still reads as provisional, and the label is now legible.

**Files:**
- Modify: `src/components/dashboard/status-badge.tsx:29`
- Modify: `src/components/dashboard/status-badge.tsx:46`

- [ ] **Step 1: Partner `provisional` badge (line 29)**

Change:

```tsx
    return `${base} border border-gold/60 text-gold opacity-60`;
```

to:

```tsx
    return `${base} border border-gold/60 text-gold-ink`;
```

- [ ] **Step 2: Owner `enquiry` badge (line 46)**

Change:

```tsx
    return `${base} border border-gold/60 text-gold opacity-60`;
```

to:

```tsx
    return `${base} border border-gold/60 text-gold-ink`;
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/status-badge.tsx
git commit -m "fix(a11y): legible provisional/enquiry badge (drop opacity, gold-ink label)"
```

---

## Task 5: Light-surface text labels → gold-ink

All remaining **resting** `text-gold` on light backgrounds becomes `text-gold-ink`. This covers eyebrow labels, the payout figure, urgent indicators, ghost-button labels, active tab, and two inline links. Leave `hover:text-gold` (links that are charcoal at rest) untouched.

**Files & exact edits:**

- [ ] **Step 1: Eyebrow / label / heading swaps (one `text-gold` → `text-gold-ink` each)**

Apply `text-gold` → `text-gold-ink` at each of these resting-label sites:

- `src/components/dashboard/month-header.tsx:31`
- `src/components/settings/from-address-section.tsx:69`
- `src/components/settings/lc-recipients-section.tsx:103`
- `src/app/(authenticated)/events/[id]/page.tsx:379`
- `src/components/dashboard/view-as-banner.tsx:6`
- `src/components/dashboard/status-chips.tsx:82` (in `border border-gold/30 text-gold hover:border-gold/60` → `… text-gold-ink hover:border-gold/60`)
- `src/components/events/brief-preview.tsx:24`
- `src/components/events/brief-preview.tsx:193`
- `src/components/events/brief-preview.tsx:419`
- `src/components/events/recipients-panel.tsx:187`
- `src/components/events/recipients-panel.tsx:207`
- `src/components/events/event-tabs.tsx:65` (active tab: `border-gold text-gold` → `border-gold text-gold-ink` — keep the bright `border-gold` underline)

In `src/components/dashboard/event-card.tsx`, the eyebrow labels at lines 102, 119, 211, 219, 227, 235 are identical (`tracking-[0.18em] uppercase text-gold`). Swap each `text-gold` → `text-gold-ink`. A safe scoped replace for this file:

```bash
sed -i '' 's/uppercase text-gold"/uppercase text-gold-ink"/g' src/components/dashboard/event-card.tsx
```

- [ ] **Step 2: `event-card.tsx` non-eyebrow gold (date + urgent indicators)**

In `src/components/dashboard/event-card.tsx`:
- Line 57: `const base = "font-[family-name:var(--font-cormorant)] font-light text-gold";` → `…font-light text-gold-ink";`
- Line 247: `brief.urgent ? "text-gold font-semibold" : "text-grey"` → `"text-gold-ink font-semibold"`
- Line 250: `checklistUrgent ? "text-gold font-semibold" : "text-grey"` → `"text-gold-ink font-semibold"`
- Line 258: `countdown.urgent ? "text-gold" : "text-charcoal"` → `"text-gold-ink"`

- [ ] **Step 3: Ghost-button labels (`border-gold text-gold` resting; keep bright border, ink the label)**

Apply `text-gold` → `text-gold-ink` at:
- `src/app/(authenticated)/events/[id]/page.tsx:205`
- `src/components/events/event-equipment.tsx:95`
- `src/components/events/event-equipment.tsx:160`
- `src/components/events/download-pdf-button.tsx:9`
- `src/components/settings/lc-recipients-section.tsx:166`

(Their `hover:bg-gold`/`hover:text-cream` fill stays — hover is not scanned.)

- [ ] **Step 4: Inline links (resting gold → ink; flip hover to bright for a lift)**

- `src/components/events/recipients-panel.tsx:100`: `text-gold hover:text-gold-ink` → `text-gold-ink hover:text-gold`
- `src/components/dashboard/dashboard-client.tsx:266`: `text-gold hover:text-gold-ink` → `text-gold-ink hover:text-gold`

- [ ] **Step 5: Verify the source gate (both greps return nothing)**

```bash
grep -rnP '(?<!-)\btext-gold\b(?!-)' src --include='*.tsx' | grep -vE 'hover:text-gold'
grep -rnP '(?<!-)\bbg-gold\b(?![-/])' src --include='*.tsx' | grep -vE 'hover:bg-gold|w-2 h-2 bg-gold'
```

Expected: both produce **no output**. If a line remains, classify it (light→ink, dark→cream) and fix.

- [ ] **Step 6: Build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "fix(a11y): migrate resting text-gold labels to gold-ink on light surfaces"
```

---

## Task 6: Document the rule + close the tracking items

**Files:**
- Modify: `src/app/globals.css` (token comment)
- Modify: `TODOS.md` (contrast follow-up section)
- Modify: `docs/launch-readiness.md` (item 4)

- [ ] **Step 1: Add the gold-usage rule to `globals.css`**

In `src/app/globals.css`, immediately after the `--color-gold-ink: #7A5416;` line (currently line 8), add a comment:

```css
  /*
   * Gold usage rule (WCAG AA): use `gold-ink` for any TEXT or button FILL on a
   * light surface (≈6.4:1 on cream). Bright `gold` is for non-text accents only
   * — focus ring, borders, dividers. On dark surfaces, labels go `cream` and
   * gold stays in the border/tint. See docs .../2026-05-30-gold-contrast-aa-fix-design.md.
   */
```

- [ ] **Step 2: Mark the contrast item resolved in `TODOS.md`**

In `TODOS.md`, under "## Design system: brand-colour contrast (follow-up)", change the `**Status:**` line to note resolution:

```markdown
**Status:** RESOLVED 2026-05-30 — gold text/fills migrated to `gold-ink` on light
surfaces; dark-surface nav labels to cream; bright gold retained for non-text accents.
The axe `color-contrast` rule is re-enabled in `e2e/accessibility.spec.ts`. See
`docs/superpowers/plans/2026-05-30-gold-contrast-aa-fix.md`.
```

And in the Manual QA list, the "axe audit" line's note about `color-contrast` being disabled is now stale — update it to "all rules enforced including color-contrast".

- [ ] **Step 3: Mark item 4 resolved in `docs/launch-readiness.md`**

Move the "Brand-colour contrast" item from the "⚖️ Engineering decision" section into a resolved note (or strike it), referencing the plan.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css TODOS.md docs/launch-readiness.md
git commit -m "docs(a11y): document gold-ink usage rule; close contrast tracking items"
```

---

## Task 7: Full verification (GREEN)

- [ ] **Step 1: Unit tests**

```bash
npm run test -- --run
```

Expected: all pass (no logic changed; this guards against accidental breakage).

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 3: Accessibility e2e — the rule that was RED in Task 1 is now GREEN**

```bash
npm run test:e2e -- accessibility.spec.ts
```

Expected: all axe tests PASS with `color-contrast` active — zero critical/serious violations on signin, owner + partner dashboards, `/events`, event detail (both roles), settings.

- [ ] **Step 4: Full e2e suite (guard against visual-class regressions in flows)**

```bash
npm run test:e2e
```

Expected: all specs pass.

- [ ] **Step 5: Final confirmation of the source gate**

```bash
grep -rnP '(?<!-)\btext-gold\b(?!-)' src --include='*.tsx' | grep -vE 'hover:text-gold'
grep -rnP '(?<!-)\bbg-gold\b(?![-/])' src --include='*.tsx' | grep -vE 'hover:bg-gold|w-2 h-2 bg-gold'
```

Expected: both empty.

---

## Self-Review (completed during planning)

**Spec coverage:** Every spec section maps to a task — light-surface text (Task 5), light-surface fills (Task 2), dark-surface (Task 3), the opacity badge edge case the spec's principle implies (Task 4), non-goals preserved (decorative gold untouched across all tasks), verification/re-enable (Tasks 1 & 7), documentation (Task 6).

**Placeholder scan:** No TBD/TODO/"handle edge cases" — every edit shows exact before/after or an exact command.

**Type consistency:** No type/signature changes; this is a className-token migration. The two completeness greps are identical everywhere they appear.

**Discovered during planning (flag for the user):** the `provisional`/`enquiry` badge used `opacity-60`, which no colour can make AA-compliant — Task 4 drops the opacity. This is a small, deliberate deviation from the PRD's "60% opacity" muted styling, justified by AA and kept visually muted via the thin border.
