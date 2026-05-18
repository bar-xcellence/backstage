# Brief Notes Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Murdo's curated standard notes (Attire + Problem Escalation + Stock Movement + On-Site Washing) reach LC via brief email, PDF, and preview — sourced from `eventStandardNotes` rather than hard-coded — and strip `WORKAROUND[id]: ` prefixes from `notesCustom` before any brief surface renders.

**Architecture:** Two new utility modules (`notes-sanitization.ts`, `event-standard-notes-query.ts`), then three render surfaces (`brief-email-template.ts`, `brief-pdf.tsx` + `text-only-brief-pdf.tsx`, `brief-preview.tsx`) accept a `standardNotes` parameter and render it. Three call sites (`pdf/route.ts`, `send-to-lc.ts`, `brief-preview.ts` action) fetch standard notes via the new query helper and pass to the renderers.

**Tech Stack:** Next.js 16.2 App Router, Drizzle ORM, React PDF, Vitest. No new dependencies. No schema migration.

**Spec reference:** `docs/superpowers/specs/2026-05-18-brief-notes-standardization-design.md`

---

## File Structure

- **Create:** `src/lib/notes-sanitization.ts` — `stripWorkaroundMarkers()` pure function
- **Create:** `src/lib/notes-sanitization.test.ts` — unit tests
- **Create:** `src/lib/event-standard-notes-query.ts` — `fetchEventStandardNotes(eventId)` DB helper
- **Modify:** `src/lib/brief-email-template.ts` — accept `standardNotes` param, render notes, sanitize notesCustom
- **Modify:** `src/lib/brief-email-template.test.ts` — extend with 3 new tests
- **Modify:** `src/lib/pdf/brief-pdf.tsx` — accept `standardNotes` prop, render notes, sanitize notesCustom
- **Modify:** `src/lib/pdf/text-only-brief-pdf.tsx` — same as brief-pdf
- **Modify:** `src/components/events/brief-preview.tsx` — accept `standardNotes` prop, render notes block, sanitize notesCustom
- **Modify:** `src/app/api/events/[id]/pdf/route.ts` — fetch standard notes, pass to BriefPDF + TextOnlyBriefPDF
- **Modify:** `src/actions/send-to-lc.ts` — fetch standard notes, pass to `buildBriefEmailHtml`
- **Modify:** `src/actions/brief-preview.ts` — fetch standard notes, pass to brief-preview client

---

## Task 1: Sanitization util with TDD

**Files:**
- Create: `src/lib/notes-sanitization.ts`
- Create: `src/lib/notes-sanitization.test.ts`

A pure regex-replace function. Strict TDD: failing test first.

- [ ] **Step 1: Write the failing test**

Create `src/lib/notes-sanitization.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { stripWorkaroundMarkers } from "./notes-sanitization";

describe("stripWorkaroundMarkers", () => {
  it("returns empty string for null", () => {
    expect(stripWorkaroundMarkers(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(stripWorkaroundMarkers(undefined)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(stripWorkaroundMarkers("")).toBe("");
  });

  it("returns input unchanged when no markers present", () => {
    expect(stripWorkaroundMarkers("Plain notes for LC.")).toBe(
      "Plain notes for LC."
    );
  });

  it("strips a single WORKAROUND prefix and keeps the content", () => {
    expect(
      stripWorkaroundMarkers(
        "WORKAROUND[substitution-stock]: Bring 4 bottles non-alcoholic gin."
      )
    ).toBe("Bring 4 bottles non-alcoholic gin.");
  });

  it("strips multiple WORKAROUND prefixes across lines", () => {
    const input =
      "60-minute masterclass format.\n\nWORKAROUND[substitution-stock]: 4 bottles non-alc gin.\n\nWORKAROUND[per-station-stock]: 13 packs gold duster.";
    const expected =
      "60-minute masterclass format.\n\n4 bottles non-alc gin.\n\n13 packs gold duster.";
    expect(stripWorkaroundMarkers(input)).toBe(expected);
  });

  it("strips case-insensitive markers", () => {
    expect(
      stripWorkaroundMarkers("workaround[host]: Lead is Murdo.")
    ).toBe("Lead is Murdo.");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test -- --run src/lib/notes-sanitization.test.ts
```

Expected: FAIL with "Cannot find module './notes-sanitization'" or similar.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/notes-sanitization.ts`:

```ts
export function stripWorkaroundMarkers(
  text: string | null | undefined
): string {
  if (!text) return "";
  return text.replace(/WORKAROUND\[[a-z0-9-]+\]:\s*/gi, "");
}
```

- [ ] **Step 4: Run tests to verify all 7 pass**

```bash
npm run test -- --run src/lib/notes-sanitization.test.ts
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Run the full suite and build**

```bash
npm run test -- --run
npm run build
```

Both pass. New util is reachable.

- [ ] **Step 6: Commit**

```bash
git add src/lib/notes-sanitization.ts src/lib/notes-sanitization.test.ts
git commit -m "$(cat <<'EOF'
feat(lib): add stripWorkaroundMarkers util for notesCustom hygiene

Strips "WORKAROUND[id]: " prefixes from notes text so internal
traceability markers don't leak to LC in rendered briefs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Standard notes query helper

**Files:**
- Create: `src/lib/event-standard-notes-query.ts`

Centralises the JOIN so all three call sites share the same query.

- [ ] **Step 1: Implement the helper**

Create `src/lib/event-standard-notes-query.ts`:

```ts
import { db } from "@/db";
import { eventStandardNotes, standardNotes } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export type EventStandardNote = {
  label: string;
  content: string;
};

export async function fetchEventStandardNotes(
  eventId: string
): Promise<EventStandardNote[]> {
  const rows = await db
    .select({
      label: standardNotes.label,
      content: standardNotes.content,
      sortOrder: eventStandardNotes.sortOrder,
    })
    .from(eventStandardNotes)
    .innerJoin(
      standardNotes,
      eq(eventStandardNotes.noteId, standardNotes.id)
    )
    .where(eq(eventStandardNotes.eventId, eventId))
    .orderBy(asc(eventStandardNotes.sortOrder));

  return rows.map(({ label, content }) => ({ label, content }));
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build
```

Expected: passes (no test yet — the integration tests via brief-email-template will cover it in Task 3).

- [ ] **Step 3: Commit**

```bash
git add src/lib/event-standard-notes-query.ts
git commit -m "$(cat <<'EOF'
feat(lib): add fetchEventStandardNotes query helper

Shared query joining eventStandardNotes with standardNotes, ordered
by sortOrder. Consumed by brief renderers (PDF, email, preview).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Brief email template — render standard notes + sanitize notesCustom

**Files:**
- Modify: `src/lib/brief-email-template.ts`
- Modify: `src/lib/brief-email-template.test.ts`

TDD: extend the existing test file with 3 new tests before changing the template.

- [ ] **Step 1: Read the existing test file**

```bash
cat src/lib/brief-email-template.test.ts | head -40
```

Note how the existing tests construct the `event`, `eventCocktails`, `stock` fixtures and what they assert.

- [ ] **Step 2: Add 3 new tests at the end of `brief-email-template.test.ts`**

Inside the existing `describe("buildBriefEmailHtml", ...)` block (find the closing `});` of that block and add these before it). If the file uses a different test structure, adapt to match.

```ts
  it("renders standard notes as Attire-style sections when provided", () => {
    const html = buildBriefEmailHtml(
      mockEvent, // reuse the existing test fixture
      [],
      mockStock,
      [
        {
          label: "Attire",
          content:
            "All extended team must arrive to site already in set attire:\n- Black bow ties\n- Black waistcoats",
        },
        {
          label: "Problem Escalation",
          content: "Call Murdo first, not the venue.",
        },
      ]
    );
    expect(html).toContain("Attire");
    expect(html).toContain("Black bow ties");
    expect(html).toContain("Black waistcoats");
    expect(html).toContain("Problem Escalation");
    expect(html).toContain("Call Murdo first");
  });

  it("omits the standard notes block entirely when none are attached", () => {
    const html = buildBriefEmailHtml(mockEvent, [], mockStock, []);
    // Old hard-coded Attire default must no longer appear
    expect(html).not.toContain("Black waistcoat, black bow tie");
  });

  it("strips WORKAROUND[id]: prefixes from notesCustom before rendering", () => {
    const eventWithMarkers = {
      ...mockEvent,
      notesCustom:
        "Real note for LC.\n\nWORKAROUND[substitution-stock]: 4 bottles non-alc gin.",
    };
    const html = buildBriefEmailHtml(eventWithMarkers, [], mockStock, []);
    expect(html).not.toContain("WORKAROUND[");
    expect(html).toContain("Real note for LC.");
    expect(html).toContain("4 bottles non-alc gin.");
  });
```

Look at the top of the existing test file to confirm the fixture variable names (likely `mockEvent`, `mockStock`). If the names differ, substitute accordingly.

- [ ] **Step 3: Run the new tests to verify they fail**

```bash
npm run test -- --run src/lib/brief-email-template.test.ts
```

Expected: the 3 new tests FAIL (type error on 4th param, or "Black waistcoat" still present, or "WORKAROUND[" present).

- [ ] **Step 4: Update `src/lib/brief-email-template.ts`**

Read the current file to locate:
- The type aliases at the top (lines ~1-8).
- The `buildBriefEmailHtml` function signature (line ~10).
- The `attireDefault` const (around line 75).
- The `notesContent` calculation (around line 121).
- The `${section("Attire", attireDefault)}` line (around line 152).

Make these changes:

**a) Import the new util at the top** (after the existing imports):

```ts
import { stripWorkaroundMarkers } from "./notes-sanitization";
import type { EventStandardNote } from "./event-standard-notes-query";
```

**b) Update the function signature** to accept a 4th param:

```ts
export function buildBriefEmailHtml(
  event: EventWithContacts,
  eventCocktails: EventCocktails,
  stock: Stock,
  standardNotes: EventStandardNote[]
): string {
```

**c) Build the standard-notes HTML before the `return` statement.** Find the line `const notesContent = event.notesCustom` and add immediately before it:

```ts
  const standardNotesHtml = standardNotes
    .map(
      (n) =>
        section(
          n.label,
          escapeHtml(n.content).replace(/\n/g, "<br>")
        )
    )
    .join("");
```

**d) Change `notesContent`** to sanitize via the util:

```ts
  const notesContent = event.notesCustom
    ? escapeHtml(stripWorkaroundMarkers(event.notesCustom)).replace(/\n/g, "<br>")
    : "";
```

**e) Delete the `attireDefault` const and replace `${section("Attire", attireDefault)}` with `${standardNotesHtml}`** in the template literal. The block of standard notes effectively replaces what used to be the single hard-coded attire section.

- [ ] **Step 5: Run tests**

```bash
npm run test -- --run src/lib/brief-email-template.test.ts
```

Expected: all tests pass (existing + 3 new).

- [ ] **Step 6: Run full suite + build**

```bash
npm run test -- --run
npm run build
```

Build may fail on call-sites of `buildBriefEmailHtml` that don't yet pass the 4th param. **That's expected** — Task 7 wires the call site. Confirm the build error is ONLY about the missing argument in `send-to-lc.ts`. If any other surface fails, investigate before proceeding.

- [ ] **Step 7: Commit (broken build OK — explained in message)**

```bash
git add src/lib/brief-email-template.ts src/lib/brief-email-template.test.ts
git commit -m "$(cat <<'EOF'
feat(brief-email): render standardNotes + sanitize notesCustom

Replaces the hard-coded attire string with iteration over the
provided standardNotes array. Strips WORKAROUND[id]: prefixes
from notesCustom before rendering.

Build temporarily fails at the send-to-lc.ts call site (no 4th
arg yet) — wired in Task 7 below.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Brief PDF + Text-only fallback PDF

**Files:**
- Modify: `src/lib/pdf/brief-pdf.tsx`
- Modify: `src/lib/pdf/text-only-brief-pdf.tsx`

React PDF components — no test suite for these directly. Manual visual check after wiring.

- [ ] **Step 1: Read both PDF files to locate the attire + notes sections**

```bash
grep -n "attire\|notesCustom\|Notes" src/lib/pdf/brief-pdf.tsx src/lib/pdf/text-only-brief-pdf.tsx | head -30
```

In `brief-pdf.tsx`:
- Type `BriefPDFProps` at top of file
- `attire` const at line ~107
- Attire `<Text>` block at lines 235-237
- notesCustom render at lines 240-245

Same shape in `text-only-brief-pdf.tsx` (find equivalent lines).

- [ ] **Step 2: Update `src/lib/pdf/brief-pdf.tsx`**

**a) Imports — at the top of the file**, add:

```tsx
import { stripWorkaroundMarkers } from "@/lib/notes-sanitization";
import type { EventStandardNote } from "@/lib/event-standard-notes-query";
```

**b) Update `BriefPDFProps`** — find the type definition (likely just above `export function BriefPDF`) and add:

```tsx
type BriefPDFProps = {
  // ...existing fields...
  standardNotes: EventStandardNote[];
};
```

**c) Update the function signature** to destructure it:

```tsx
export function BriefPDF({
  event,
  contacts,
  cocktails,
  stock,
  standardNotes,
}: BriefPDFProps) {
```

**d) Delete the hard-coded `attire` const** (line ~107-108).

**e) Replace the Attire block (lines ~235-237)** — currently:

```tsx
        {/* 13. Attire */}
        <Text style={s.sectionTitle}>Attire</Text>
        <Text style={s.text}>{attire}</Text>
```

with iteration:

```tsx
        {/* 13. Standard Notes */}
        {standardNotes.map((note) => (
          <View key={note.label} wrap={false}>
            <Text style={s.sectionTitle}>{note.label}</Text>
            <Text style={s.text}>{note.content}</Text>
          </View>
        ))}
```

(If `View` isn't imported, add it to the existing `@react-pdf/renderer` import line near the top.)

**f) Sanitize the Notes section.** Find:

```tsx
            <Text style={s.text}>{event.notesCustom as string}</Text>
```

Replace with:

```tsx
            <Text style={s.text}>{stripWorkaroundMarkers(event.notesCustom as string)}</Text>
```

- [ ] **Step 3: Apply the SAME 6 changes to `src/lib/pdf/text-only-brief-pdf.tsx`**

Mirror the edits — imports, props, signature, attire block, notes sanitization. The component structure is similar; field/line numbers may differ.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Build will still fail at the PDF route call site (Task 6 wires it). Confirm the only errors are about the missing `standardNotes` prop on `BriefPDF({...})` and `TextOnlyBriefPDF({...})` in `src/app/api/events/[id]/pdf/route.ts`. No other surfaces should fail.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/brief-pdf.tsx src/lib/pdf/text-only-brief-pdf.tsx
git commit -m "$(cat <<'EOF'
feat(brief-pdf): render standardNotes + sanitize notesCustom

Both BriefPDF and TextOnlyBriefPDF accept a standardNotes array
and render each as a section. Hard-coded attire string removed.
notesCustom sanitized of WORKAROUND[id]: prefixes.

Build temporarily fails at the PDF route call site (no
standardNotes prop yet) — wired in Task 6 below.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Brief preview client component

**Files:**
- Modify: `src/components/events/brief-preview.tsx`

Client component. Plain-object `EventStandardNote[]` serializes from server fine.

- [ ] **Step 1: Read the brief-preview component**

```bash
grep -n "interface\|type.*Props\|notesCustom\|hasNotes\|Section" src/components/events/brief-preview.tsx | head -30
```

Identify:
- The props type / interface (top of file).
- The `hasNotes` computation (around line 68).
- The Notes section render (around line 314-322).
- Where to insert the new Standard Notes section — between the Notes section and the close of the panel.

- [ ] **Step 2: Update the component**

**a) Imports** at the top:

```tsx
import { stripWorkaroundMarkers } from "@/lib/notes-sanitization";
import type { EventStandardNote } from "@/lib/event-standard-notes-query";
```

**b) Update the props type** — find the existing `interface BriefPreviewProps {...}` or similar, add:

```tsx
  standardNotes: EventStandardNote[];
```

**c) Update the component signature** to destructure:

```tsx
export function BriefPreview({
  event,
  // ...other existing props...
  standardNotes,
  onClose,
}: BriefPreviewProps) {
```

(Match the existing destructure shape; add `standardNotes` to it.)

**d) Sanitize the existing notesCustom render** — find:

```tsx
                {event.notesCustom && <p>{event.notesCustom}</p>}
```

Replace with:

```tsx
                {event.notesCustom && (
                  <p>{stripWorkaroundMarkers(event.notesCustom)}</p>
                )}
```

**e) Add a Standard Notes section** — immediately after the closing `</Section>` for the Notes block (around line 322-325), add:

```tsx
            {standardNotes.length > 0 && (
              <Section title="Standard Notes">
                <div className="space-y-3">
                  {standardNotes.map((note) => (
                    <div key={note.label}>
                      <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-gold">
                        {note.label}
                      </p>
                      <p className="whitespace-pre-line">{note.content}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
```

(Reuse the existing `<Section>` component style; check the file for the exact heading-label utility classes if they differ.)

- [ ] **Step 3: Build**

```bash
npm run build
```

Still fails at the brief-preview action call site (Task 8 wires it).

- [ ] **Step 4: Commit**

```bash
git add src/components/events/brief-preview.tsx
git commit -m "$(cat <<'EOF'
feat(brief-preview): render standardNotes + sanitize notesCustom

Adds a Standard Notes section below the Notes section, iterating
the provided standardNotes array. notesCustom sanitized of
WORKAROUND[id]: prefixes.

Build temporarily fails at the brief-preview action call site
(no standardNotes prop yet) — wired in Task 8 below.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wire PDF route to pass standard notes

**Files:**
- Modify: `src/app/api/events/[id]/pdf/route.ts`

- [ ] **Step 1: Update imports** — add at the top:

```ts
import { fetchEventStandardNotes } from "@/lib/event-standard-notes-query";
```

- [ ] **Step 2: Fetch standard notes** alongside the other DB calls. Find the block fetching contacts + cocktails (around line 57-87) and add immediately after it:

```ts
    const standardNotes = await fetchEventStandardNotes(id);
```

- [ ] **Step 3: Pass `standardNotes` to both PDF renderers.** Find the `renderBriefWithFallback` call (around line 115) and update:

```ts
    const { buffer: pdfBuffer, usedFallback } = await renderBriefWithFallback(
      () =>
        renderToBuffer(
          BriefPDF({ event: safeEvent, contacts, cocktails: enrichedCocktails, stock, standardNotes })
        ),
      () =>
        renderToBuffer(
          TextOnlyBriefPDF({ event: safeEvent, contacts, cocktails: enrichedCocktails, stock, standardNotes })
        )
    );
```

- [ ] **Step 4: Verify build now passes for this surface**

```bash
npm run build
```

If only the email + preview action call sites are still failing, that's expected — they're Tasks 7 + 8.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/events/[id]/pdf/route.ts
git commit -m "$(cat <<'EOF'
feat(pdf-route): fetch standardNotes and pass to brief PDFs

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Wire send-to-lc action to pass standard notes

**Files:**
- Modify: `src/actions/send-to-lc.ts`

- [ ] **Step 1: Update imports** — add at the top:

```ts
import { fetchEventStandardNotes } from "@/lib/event-standard-notes-query";
```

- [ ] **Step 2: Fetch and pass.** Find the call to `buildBriefEmailHtml`. Before that call, fetch the notes:

```ts
  const standardNotes = await fetchEventStandardNotes(eventId);
```

Then update the call site:

```ts
  const html = buildBriefEmailHtml(event, eventCocktails, stock, standardNotes);
```

(The exact variable names like `event`, `eventCocktails`, `stock`, and `eventId` are already in the file — match what's there.)

- [ ] **Step 3: Build**

```bash
npm run build
```

Only the brief-preview action call site should still fail (Task 8).

- [ ] **Step 4: Commit**

```bash
git add src/actions/send-to-lc.ts
git commit -m "$(cat <<'EOF'
feat(send-to-lc): pass standardNotes to brief email builder

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Wire brief-preview action to pass standard notes

**Files:**
- Modify: `src/actions/brief-preview.ts`

- [ ] **Step 1: Read the file**

```bash
cat src/actions/brief-preview.ts
```

Understand how it currently returns event data to the client.

- [ ] **Step 2: Update imports** — add at the top:

```ts
import { fetchEventStandardNotes } from "@/lib/event-standard-notes-query";
```

- [ ] **Step 3: Fetch and include in the return.** Match the existing pattern — likely the action returns `{ event, cocktails, stock, ... }`. Add `standardNotes` to that return shape:

```ts
  const standardNotes = await fetchEventStandardNotes(eventId);
  // existing return object becomes:
  return { /* existing fields */, standardNotes };
```

- [ ] **Step 4: Update the consumer of this action** — find where the action's result is passed to `<BriefPreview ...>` and add the `standardNotes` prop:

```bash
grep -rn "BriefPreview" src/components src/app | head -10
```

In the file that renders `<BriefPreview>`, pass `standardNotes={result.standardNotes}` (or whatever variable holds the action result).

- [ ] **Step 5: Build + full test suite**

```bash
npm run build
npm run test -- --run
```

Expected: both pass. ALL three surfaces now type-check end-to-end.

- [ ] **Step 6: Commit**

```bash
git add src/actions/brief-preview.ts $(grep -rln "BriefPreview" src/components src/app | head -5)
git commit -m "$(cat <<'EOF'
feat(brief-preview-action): return standardNotes; wire into preview

Closes the type chain: action fetches standardNotes via the shared
query helper and passes through to the client BriefPreview component.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: End-to-end verification + close out

**Files:**
- (no source changes — verification + optional documentation update)

- [ ] **Step 1: Full test suite green**

```bash
npm run test -- --run
```

Expected: all prior tests + 3 new brief-email tests + 7 new sanitization tests = 96+ tests pass.

- [ ] **Step 2: Build green**

```bash
npm run build
```

- [ ] **Step 3: Manual verification via DB query**

Run a quick query confirming the data flow. Use `tsx --env-file=.env.local -e "..."` or open a Drizzle Studio session. Verify both seeded events still have 4 attached standardNotes each. Expected count: 8 rows in `event_standard_notes` (4 per event × 2 events).

```bash
npx tsx --env-file=.env.local -e '
import { db } from "./src/db/index.js";
import { eventStandardNotes } from "./src/db/schema.js";
const rows = await db.select().from(eventStandardNotes);
console.log("Total event_standard_notes rows:", rows.length);
console.log(rows);
'
```

If this command fails because of TS/ESM path issues, skip — the test suite already covers the data flow.

- [ ] **Step 4: Open PR (optional — if user wants to land via PR)**

```bash
gh pr create --title "Standard notes + WORKAROUND hygiene in brief surfaces" --body "$(cat <<'EOF'
## Summary
- Standard notes (Attire, Problem Escalation, Stock Movement, On-Site Washing) now reach LC via the brief email, PDF, and preview — sourced from `eventStandardNotes` instead of hard-coded
- `WORKAROUND[id]: ` prefixes are stripped from `notesCustom` before any brief surface renders, so internal traceability markers don't leak

Implements Spec B + Spec F from `docs/plans/2026-05-18-event-sheet-gap-report.md`.

Spec: `docs/superpowers/specs/2026-05-18-brief-notes-standardization-design.md`
Plan: `docs/superpowers/plans/2026-05-18-brief-notes-standardization.md`

## Test plan
- [x] Unit tests for `stripWorkaroundMarkers` (7 cases)
- [x] Unit tests for `buildBriefEmailHtml` (3 new + existing)
- [x] `npm run build` passes
- [ ] Manual: open Heathrow + Glasgow events, trigger PDF + Send-to-LC preview, verify standard notes appear with Murdo's content and no WORKAROUND tokens are visible

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Update gap report** — mark Spec B + F as ✓ done in `docs/plans/2026-05-18-event-sheet-gap-report.md` "Recommended follow-up specs" section. Find the lines:

```markdown
- **Spec B: Standard notes + attire reach LC** ...
- **Spec F: notesCustom hygiene + workaround tokenization** ...
```

Prefix each with `✓ ` and append `— **Done** in feat/real-event-seed-and-gap-report (commits TBD list)`. Commit:

```bash
git add docs/plans/2026-05-18-event-sheet-gap-report.md
git commit -m "$(cat <<'EOF'
docs(plan): mark Spec B + F done in gap report

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Done

After Task 9, both Spec B and Spec F are complete:

1. ✓ Standard notes flow from DB to all 3 brief surfaces (email, PDF, preview)
2. ✓ Hard-coded attire string removed
3. ✓ `WORKAROUND[id]: ` prefixes stripped from notesCustom before render
4. ✓ Test coverage: 10 new unit tests
5. ✓ Build + full test suite green

The branch `feat/real-event-seed-and-gap-report` now contains both the seed-and-gap-report work and Spec B+F. PR-ready when you are.
