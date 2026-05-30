# Palette Contrast Follow-up — Findings

**Date:** 2026-05-30
**Status:** Findings captured; not yet brainstormed/planned. Seed for a future design session.
**Parent:** `docs/superpowers/specs/2026-05-30-gold-contrast-aa-fix-design.md` (the gold half — DONE)

## Why this exists

The gold-contrast work re-enabled axe's `color-contrast` rule and discovered that the rule
had been masking the **whole Reserve Noir palette**, not just gold. With gold migrated to
`gold-ink`, the dashboards pass, but signin / events list / event detail / settings still fail
on **non-gold** combinations that were always sub-AA. Resolving them needs brand-token
decisions (the same kind the gold fix needed), so they were deferred rather than decided
unilaterally. `color-contrast` stays disabled in `e2e/accessibility.spec.ts` until this lands.

## The remaining debt (measured by axe, WCAG AA = 4.5:1 normal text)

### 1. Semantic status pills — `bg-{token}/NN text-{token}` (highest impact)

Owner map `src/lib/constants.ts:1-8` (`STATUS_COLORS`) and partner map
`src/app/(authenticated)/events/[id]/page.tsx:34-39` (`PARTNER_STATUS_COLORS`). Rendered at
10px on event detail, events list (`event-data-table.tsx`), and dashboard (`dashboard-client.tsx`).

| Pill | Classes | Ratio |
|---|---|---|
| confirmed | `bg-cognac/20 text-cognac` (#b8860b on #ede2c7) | 2.52:1 |
| delivered | `bg-success/20 text-success` (#4e8a3e on #d8e3d1) | 3.14:1 |
| ready | `bg-botanical/20 text-botanical` | (similar, ~3:1) |
| cancelled | `bg-error/10 text-error/60` | fails |
| enquiry/provisional | `bg-grey/20 text-grey` | borderline |

(The `preparation` gold pill was already fixed in the gold pass → `text-gold-ink`.)

**Decision needed:** darken the semantic tokens (`cognac`/`success`/`botanical`/`error`) to AA
on their own tint, OR switch pill text to `text-charcoal` on the tint, OR enlarge/bold the pill
text to qualify as AA-Large (3:1). A token darken is the most consistent (also fixes §2).

### 2. 10px semantic meta labels on light surfaces

- `text-success` — `src/components/events/event-data-table.tsx:74`, `event-kanban.tsx:135` (3.96:1 on cream)
- `text-error` (10px uppercase) — `src/components/settings/lc-recipients-section.tsx:141`

Fixed automatically if §1 darkens the tokens; otherwise enlarge or darken locally.

### 3. Faded greys on dark / light

- `src/app/auth/signin/page.tsx:94` — `text-grey-light/70` on charcoal (#767b88 on #1e1f2e) = 3.84:1. Fix: drop the `/70` (full `grey-light` is ~6.2:1). Easy, no brand call.
- `src/app/(authenticated)/recipes/page.tsx:79,114` — `text-grey/30`, `text-grey/40` empty-state text. Lighten less / bump opacity.

### 4. Borderline grey on `surface-low` (just under threshold)

Inactive toggle/tab buttons `bg-surface-low text-grey` (#6b7280 on #f4f3f1) = **4.35:1** (needs 4.5). Sites: `view-toggle.tsx:38,48`, `event-tabs.tsx:66`, `recipes/page.tsx:48`, `dashboard-client.tsx:126`, `event-equipment.tsx:208`. Fix: a slightly darker inactive token (e.g. `text-grey` → a `#5C6370`-ish) or `text-charcoal/70`.

## Suggested approach (for the future session)

1. Make the token decision for §1 (recommend: introduce AA-safe `*-ink` variants for `success`/`error`/`cognac`/`botanical` like gold-ink, used for text-on-tint; keep bright tokens for fills/borders). This resolves §1 + §2 together.
2. Sweep §3 + §4 (mechanical opacity/token nudges, no brand call).
3. Re-enable `color-contrast` (`DISABLED_RULES = []` in `e2e/accessibility.spec.ts`) and confirm all 7 scanned pages pass.

## Not in scope here

The brief-preview slide-over is a dark panel and is not axe-scanned (it only renders on user
action). Its headings were set to `text-cream` during the gold pass for readability.
