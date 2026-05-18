# Brief Notes Standardization (Spec B + F) — Design

**Date:** 2026-05-18
**Scope:** Combines two gap-report follow-up specs that share the same files:
- **Spec B** — Standard notes + attire reach LC. Refactor brief surfaces to render the linked `eventStandardNotes` (label + content) and remove the hard-coded attire string.
- **Spec F** — `notesCustom` hygiene. Strip `WORKAROUND[id]: ` prefixes from `notesCustom` before rendering, so internal markers don't leak to LC.

**Out of scope:** Spec C (host visibility), Spec D (pop-up bar branding), Spec G (multi-line address), and the other follow-up specs from the gap report. Touching them would expand B+F beyond their stated S+XS scope. Will be revisited in their own specs.

## Goal

Today the brief email, brief PDF, and brief preview each:

1. **Hard-code attire** to a one-line generic string — ignoring the 4 reusable `standardNotes` rows Murdo curated (and which Backstage already attaches to both seeded events via `eventStandardNotes`).
2. **Render `notesCustom` verbatim**, including the internal `WORKAROUND[id]:` markers we seeded for traceability — so LC currently sees "WORKAROUND[substitution-stock]: Substitution stock not in any recipe — 4 bottles..." which is gibberish to them.

After this spec ships:
- LC receives Murdo's curated standard notes (Attire as a bulleted block, plus Problem Escalation / Stock Movement / On-Site Washing) on every brief surface, sourced from the database not hard-coded strings.
- `notesCustom` renders with `WORKAROUND[id]: ` prefixes stripped, so only the readable content reaches LC.

## Architecture

Two data flows change, three surfaces change.

### Data flow change

Three call sites currently fetch event data but skip `eventStandardNotes`:

- `src/app/api/events/[id]/pdf/route.ts` — PDF download endpoint
- `src/actions/send-to-lc.ts` — Send-to-LC email action
- `src/actions/brief-preview.ts` — Send-to-LC preview action

Each adds a join against `eventStandardNotes → standardNotes` (ordered by `eventStandardNotes.sortOrder`) and passes the resulting `{ label, content }[]` to the rendering surface.

A reusable query helper lives at `src/lib/event-standard-notes-query.ts`:

```ts
export type EventStandardNote = { label: string; content: string };
export async function fetchEventStandardNotes(eventId: string): Promise<EventStandardNote[]>;
```

This keeps the join logic in one place — all three call sites use it.

### Rendering surface changes

Three files render the brief. Each gets the same two structural changes:

1. **Attire section** — currently `Text/section("Attire", attireDefault)`. Replaced with iteration over the standard-notes array, rendering each note's label as a section heading and `content` as the body (newlines preserved). If no standard notes are attached, the surface omits the block entirely (no fallback hard-coded string).

2. **Notes section** — currently renders `event.notesCustom` raw. Wrapped with `stripWorkaroundMarkers()` from a new tiny util.

### Sanitization util

`src/lib/notes-sanitization.ts`:

```ts
export function stripWorkaroundMarkers(text: string | null | undefined): string {
  if (!text) return "";
  // Removes "WORKAROUND[<id>]: " prefix anywhere in the text, preserving the content after it.
  // Matches case-insensitive, kebab-case ids only.
  return text.replace(/WORKAROUND\[[a-z0-9-]+\]:\s*/gi, "");
}
```

Trade-off chosen: **strip the prefix, keep the content.** The content after `WORKAROUND[id]: ` is genuinely useful to LC (e.g. "Substitution stock — 4 bottles non-alc gin..."). Removing the whole line would lose that. The wording is occasionally engineer-y ("not in any recipe") but it's still readable. If Murdo wants cleaner phrasing later, that's a content edit not a code change.

Alternative considered and rejected: move workarounds to a separate `outcomeNotes`-style internal-only field. This would require schema changes, a migration, and seed.ts edits — far beyond Spec F's XS scope.

## File changes

### New files

- `src/lib/notes-sanitization.ts` — `stripWorkaroundMarkers()` + types if needed
- `src/lib/notes-sanitization.test.ts` — unit tests (empty/null/no-markers/single/multiple/case/preserves-content)
- `src/lib/event-standard-notes-query.ts` — `fetchEventStandardNotes(eventId)` helper

### Modified files

- `src/lib/brief-email-template.ts` — accept `standardNotes` param; replace `attireDefault` block with iteration; wrap `notesCustom` with sanitizer
- `src/lib/brief-email-template.test.ts` — add tests: standardNotes render, attire omitted when no notes attached, WORKAROUND tokens stripped
- `src/lib/pdf/brief-pdf.tsx` — accept `standardNotes` prop; replace `attire` const + render block with iteration; wrap `notesCustom` with sanitizer
- `src/lib/pdf/text-only-brief-pdf.tsx` — same changes as brief-pdf.tsx (it's the fallback PDF)
- `src/app/api/events/[id]/pdf/route.ts` — call `fetchEventStandardNotes`, pass to both `BriefPDF` and `TextOnlyBriefPDF`
- `src/actions/send-to-lc.ts` — call `fetchEventStandardNotes`, pass to `buildBriefEmailHtml`
- `src/actions/brief-preview.ts` — call `fetchEventStandardNotes`, pass to the preview component
- `src/components/events/brief-preview.tsx` — accept `standardNotes` prop; add Standard Notes section (between Notes and footer); wrap `notesCustom` with sanitizer

### No changes

- `src/db/schema.ts` — no schema migration
- `src/db/seed.ts` — `WORKAROUND[id]:` markers stay in seed for traceability; sanitization happens at render time
- `src/actions/events.ts` / `src/actions/standard-notes.ts` — they already expose what's needed; no API changes

## Testing

### Unit tests (Vitest)

- `notes-sanitization.test.ts` — 6 cases: null, empty, no markers, single marker, multiple markers, mixed case
- `brief-email-template.test.ts` — extend existing suite: attire renders from standard notes when present, attire section omitted when no notes attached, WORKAROUND markers stripped from notesCustom

### Manual verification

After implementation:
1. Run `npm run seed` (no changes expected; seed is unchanged).
2. Trigger the PDF endpoint for the Heathrow event in dev — verify attire block has all 4 Murdo notes, verify `WORKAROUND[substitution-stock]:` is absent from the Notes section.
3. Same for Glasgow.
4. Open Send-to-LC preview for both events — same checks.
5. (Email send not tested live — same template path as preview, so visual equivalence is sufficient.)

### Regression

- `npm run test -- --run` — all 86 prior tests still pass + new tests
- `npm run build` — passes
- E2E tests (`npm run test:e2e`) — should remain green; they don't currently inspect brief content but they exercise event creation flows

## Risks

- **Type changes on `BriefPDF` / `buildBriefEmailHtml` / `BriefPreview` props.** All three signatures gain a new required `standardNotes` parameter. All call sites are inside this repo and updated in the same PR — no downstream consumers.
- **`brief-preview.tsx` is a Client Component.** Passing `standardNotes` from server to client requires plain-object serialization. The query result is already `{ label: string, content: string }[]` — plain objects, no problem.
- **Empty-state coverage.** If an event has zero `eventStandardNotes`, the brief omits the Attire/Notes section entirely. Murdo's two seeded events both have all 4 notes attached — this risk is theoretical for now but worth covering in tests.

## Out-of-scope safeguards

- We don't add the "Attire" label as a special-cased section — all standard notes render uniformly. If Murdo wants Attire visually emphasized (e.g. always first, larger), that's a styling pass not in B+F.
- We don't expose a UI to attach standard notes to events — that already exists; the seed has demonstrated it works.
- We don't strip internal `[WORKAROUND tags]` from `notesCustom` differently per surface — the sanitization is symmetric across email/PDF/preview.

## Success criteria

For both seeded events:
- Brief email, brief PDF, and brief preview each show a Standard Notes block containing Attire (5-line bulleted), Problem Escalation, Stock Movement, On-Site Washing — sourced from DB.
- No occurrence of the literal string `WORKAROUND[` in any rendered brief output.
- All tests pass; build passes; types compile clean.
