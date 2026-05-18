# Real Event Seed + Gap Report — Design

**Date:** 2026-05-18
**Scope:** Seed two real Bar Excellence events (Heathrow masterclass on 2026-05-15, Glasgow signature service on 2026-04-23) end-to-end into the database, then produce a gap report comparing the rendered event sheet against each original PDF.
**Out of scope:** Schema migrations, new scaling rules, stock calculator changes, UI grouping for stock list categories, structured address fields, host designation, substitution stock model, vinyl banner/branding fields. All of these wait on the gap report's findings.

## Goal

Murdo sends Lexington Catering (LC) bespoke PDF "Brief Packs" for each event today. The platform's goal is to replace those PDFs with a generated event sheet. Before investing in further schema work we want to know, concretely, what real events the current schema can capture and what it can't. This spec does the validation pass: load two recent real events into the DB using only what exists today, render their event sheets, and write up what does and doesn't match the originals.

A secondary benefit: this closes the open `TODOS.md` item "Get Murdo's cocktail recipes" — the two PDFs supply 6 real recipes that replace the 3 placeholders currently seeded (Espresso Martini, Negroni, Mojito).

## Reference PDFs

- `~/Downloads/Heathrow Event Sheet PDF.pdf` — 130-guest cocktail masterclass at London Hilton Heathrow Terminal 5, 13 tables × 10 guests, 2 cocktails per guest, Murdo hosts, 4 LC bartenders support.
- `~/Downloads/Brief Sheet 23rd April - Glasgow (PDF).pdf` — 100-guest signature cocktail service at Aurora @ Pinsent Masons Glasgow, 3 bartender stations on a 3m curved pop-up bar with vinyl banner, 2 cocktails per guest, 4 cocktails on the menu.

## Architecture

The work is data-only — no source changes outside `seed.ts`, no schema migrations, no library or UI changes. The seed extends the existing pattern in `src/db/seed.ts` (which today seeds users + 3 placeholder cocktails).

```
seed.ts
  ├── users (unchanged)
  ├── cocktails (REPLACED: 3 placeholders → 6 real)
  │     ├── cocktailIngredients
  │     └── cocktailGarnishes
  ├── standardNotes (NEW: 4 reusable boilerplate blocks)
  ├── equipmentTemplates (NEW: 2 templates)
  │     └── equipmentTemplateItems
  └── events (NEW: 2 historical events, status=delivered)
        ├── eventContacts
        ├── eventCocktails
        ├── eventEquipment (hardcoded quantities, see Workarounds)
        └── eventStandardNotes
```

After seed runs, Rob walks both events in the UI, renders the event sheet (HTML and PDF), and writes the gap report at `docs/plans/2026-05-18-event-sheet-gap-report.md`.

## Cocktail library (replaces placeholders)

| # | Name | Glass | Ice | Straw | Source | Spirit base |
|---|---|---|---|---|---|---|
| 1 | Spiced Passionstar | rocks | 200g cubed | black short cardboard | Heathrow | 25ml spiced rum |
| 2 | Springtime Clover Club | coupe | 200g cubed | — (bamboo spear) | Heathrow | 25ml gin |
| 3 | Clydeport Celebration | rocks | 200g crushed | black short cardboard | Glasgow | 50ml Drambuie |
| 4 | Barrowlands Stars | rocks | 200g cubed | black short cardboard | Glasgow | 35ml spiced rum |
| 5 | Wellingtons Gin Club | coupe | 200g cubed | — (bamboo spear) | Glasgow | 35ml gin |
| 6 | Clockwork Orange Margarita | coupe | 200g cubed | — | Glasgow | 25ml tequila + 25ml triple sec |

All Boiron-branded ingredients get `brand: "Boiron"`. Sister recipes (#4↔#1, #5↔#2) seeded as separate entries — no `variant` flag or relation. The platform doesn't model recipe variants today and adding that would be schema scope creep.

Full ingredient and garnish data follows each PDF's "Specs" section verbatim. Foamer entries use `unit: "drops"` (3 drops per serve). Ice uses `iceAmountG: 200` and `iceType: "Cubed"` or `"Crushed"`. Garnishes preserve quantity per serve (e.g. 2 raspberries + 1 mint sprig for Clover Club / Wellingtons Gin Club).

One ambiguity: Clydeport Celebration's spec reads `10ml Gomme (check)`. Seeded at 10ml; flagged in the gap report for Murdo to confirm.

## Standard notes (seeded reusable blocks)

Both PDFs contain near-identical boilerplate. Seeded as four entries in `standardNotes`:

1. **Attire** — "Black bow ties / Black waistcoats / White ironed shirts / Smart black trousers (not jeans) / Polished black shoes (not trainers). All extended team must arrive to site already in set attire."
2. **Problem escalation** — "Any problems to solve, Murdo will be there for first few hours. After that, call him with anything to solve. Do not ask the venue teams."
3. **Stock movement** — "All alcohol and ingredients must be moved in sealed boxes from the vehicle through the building to the event space. No bags or open boxes. Bring a trolley to move the items."
4. **No on-site washing** — "We are not washing any glasses on site."

Both seeded events attach all four notes via `eventStandardNotes`.

## Equipment templates

Two templates inferred from both PDFs:

**Bartender Kit** (`scaling_rule: per_station`, `base_quantity: 1`)
- Speedpours, fruit knife, chopping board, plastic shaker (3-piece), Hawthorn strainer, fine strainer, squeeze bottle, bar spoon

**Service Setup** (mixed rules)
- Bin + bin liners (`fixed`)
- Brush + dustpan (`fixed`)
- First aid kit (`fixed`)
- Menu in holder (`fixed`)
- Ice bucket (`per_station`)
- Ice scoop (`per_station`)
- Fruit plate (`per_station`)
- Pens for labels (`fixed`, 4)
- Sticky labels (`fixed`, 1 pack)

The templates exist so future events can apply them with one click; they aren't required to seed the two events here (we'll insert `eventEquipment` rows directly to mirror exactly what Murdo's PDFs say). The templates seed verifies that infrastructure still works after Phase 3b.

## Events

### Heathrow — 2026-05-15 (status: delivered)

| Field | Value | Notes |
|---|---|---|
| `eventName` | "Hexaware Cocktail Masterclass" | (Hexaware is Prakharg's company) |
| `eventDate` | 2026-05-15 | |
| `venueName` | "London Hilton Heathrow Airport Terminal 5, Poole Rd, Colnbrook, Heathrow, SL3 0FF" | **WORKAROUND**: address jammed into single field |
| `venueHallRoom` | "Conference room" | |
| `guestCount` | 130 | |
| `prepaidServes` | 260 | 2 per guest |
| `eventType` | `masterclass` | |
| `serviceType` | `cocktails_mocktails` | |
| `arriveTime` | 16:00 | |
| `setupDeadline` | 18:45 | |
| `serviceStart` | 19:15 | |
| `serviceEnd` | 20:15 | |
| `departTime` | 20:30 | |
| `stationCount` | 13 | 13 tables of 10 guests |
| `stationLayoutNotes` | "13 tables of 10 guests, 8 glass bottles + foamer + garnishes + ice bucket + scoop + plate of pre-cut garnishes per table" | |
| `staffCount` | 4 | LC cocktail bartenders |
| `staffNames` | "Murdo MacLeod (host); LC supplies 4 bartenders" | **WORKAROUND**: no host field |
| `installInstructions` | Trolley required; sealed boxes; meet Murdo at hotel loading bay at 16:00 | |
| `status` | `delivered` | Event already happened |

**Contacts** (3 rows in `eventContacts`):
- Murdo MacLeod — host — 07882084422 — (no email) — `isPrimary: true`
- Nafisa Ali — venue — (no phone) — nafisa.ali@hilton.com
- Prakharg Ghildyal — client — +447776651243 — prakharg@hexaware.com

**Cocktails** (`eventCocktails`):
- Spiced Passionstar — menuName="Spiced Passionstar", `stationNumber: null` (all tables serve both), `servesAllocated: 130`
- Springtime Clover Club — `servesAllocated: 130`

**Equipment** (`eventEquipment`, hardcoded quantities mirroring PDF):
- 110 glass bottles (104 in service + 6 spare per Murdo's note), 4 pens, 1 sticky label pack, 13 ice buckets, 13 ice scoops, 13 fruit plates, 3 fruit knives, 3 chopping boards, 140 rocks glasses, 140 coupe glasses, 140 plastic shakers (3-piece), 1 brush + dustpan, 1 trolley, 6 large plastic boxes with lids
- **WORKAROUND**: 140 rocks/coupes/shakers = 130 guests + 10 spare. No `per_guest` scaling rule, so all hardcoded as `isFromTemplate: false`. Plastic-box qty (6) is a judgement call — Murdo's PDF doesn't specify; flagged in gap report.

**Custom notes** (`notesCustom`):
- "60-minute masterclass format, 2 cocktails per guest (one of each menu item)"
- "Substitution stock: 4 bottles non-alcoholic gin, 4 bottles non-alcoholic spiced rum (Captain Morgan Non Alco Spiced recommended)" — **WORKAROUND**: no substitution stock model
- "Edible gold duster spray: 13 packs (1 per table)" — **WORKAROUND**: per-station consumable, calculator would over-count from per-serve garnish
- "Miraculous foamer: 13 bottles (1 per table)" — same workaround

**Standard notes attached:** all 4 (attire, escalation, stock movement, no washing).

### Glasgow — 2026-04-23 (status: delivered)

| Field | Value | Notes |
|---|---|---|
| `eventName` | "Pinsent Masons Office Social" | |
| `eventDate` | 2026-04-23 | |
| `venueName` | "Aurora @ Pinsent Masons (catered by Lexington Catering), 120 Bothwell Street, Glasgow, G2 7JS" | **WORKAROUND**: address + venue name + caterer all in one field |
| `venueHallRoom` | "Aurora" | |
| `guestCount` | 100 | |
| `prepaidServes` | 200 | 2 per guest |
| `eventType` | `drinks_reception` | |
| `serviceType` | `cocktails_mocktails` | |
| `arriveTime` | 15:00 | |
| `setupDeadline` | 17:00 | "Stations all set by 5pm" |
| `serviceStart` | 18:00 | |
| `serviceEnd` | 21:00 | |
| `departTime` | 21:30 | (inferred — PDF says service ends at 21:00) |
| `stationCount` | 3 | 3 bartender stations on the bar |
| `stationLayoutNotes` | "3 bartender stations on a 3m curved pop-up bar. 40 cocktails pre-poured on bar top at 17:45 (10 of each of 4 types). All stock and glassware hidden behind bar." | |
| `staffCount` | 3 | |
| `staffNames` | "Murdo MacLeod (host); James McClymont; 3 LC bartenders" | **WORKAROUND**: no host field |
| `popUpBar` | true | |
| `popUpBarSupplier` | "3m curved, vinyl banner front branding attached seamlessly" | **WORKAROUND**: branding text shoehorned into supplier field |
| `installInstructions` | "Meet Murdo outside the building at 15:00. Bar in place first, vinyl attached seamlessly. All stock/glassware hidden behind bar out of sight. Loading bay access TBC (updated Tuesday before event)." | |
| `status` | `delivered` | |

**Contacts** (2 rows):
- Murdo MacLeod — host — 07882084422 — `isPrimary: true`
- James McClymont — — 07916857416 —

**Cocktails** (`eventCocktails`, 50 serves each):
- Clydeport Celebration
- Wellingtons Gin Club
- Barrowlands Stars
- Clockwork Orange Margarita

**Equipment** (`eventEquipment`):
- 100 etched rocks glasses, 100 coupe glasses, 2 back bins + bin liners, 3 ice buckets + 3 scoops, 1 large box (cubed ice), 1 large box (crushed ice), 3 bartender kits (expanded from template), 1 first aid box, 1 brush + dustpan, 1 menu in holder
- **WORKAROUND**: 100 etched/coupe = exact guest count. Glassware count = guest count is a `per_guest` scaling pattern that doesn't exist.

**Custom notes**:
- "Pre-pour 40 cocktails on bar top at 17:45 (10 of each of 4 types). Bar top must be clean and beautiful throughout service."
- "Glasses to be collected from floor and returned to bar throughout service."
- "Substitution stock: 1 bottle each — non-alc scotch whisky, non-alc gin, non-alc spiced rum, non-alc agave spirit" — **WORKAROUND**
- "Cubed ice 30kg + Crushed ice 10kg" — **WORKAROUND**: stock calculator may aggregate both as 'g'
- "Venue also serves wine + champagne from a separate bar (not our responsibility)"

**Standard notes attached:** all 4.

## Workarounds summary

Every workaround in the seed gets a code comment of the form:

```ts
// WORKAROUND[gap-id]: <short description>
// See docs/plans/2026-05-18-event-sheet-gap-report.md
```

Workarounds applied in this seed:

| ID | Where | Why |
|---|---|---|
| `address` | `venueName` field | No multi-line address fields |
| `host` | `staffNames` text | No `isHost` flag on contacts/staff |
| `branding` | `popUpBarSupplier` text | No `barBrandingNotes` field |
| `per-guest-equipment` | `eventEquipment` hardcoded qty | No `per_guest` scaling rule |
| `per-station-stock` | `notesCustom` | Stock calculator multiplies by serves, not stations |
| `substitution-stock` | `notesCustom` | No model for "carry these but they're not in recipes" |
| `pre-pour-batching` | `notesCustom` | No first-class field for pre-batched serves |
| `ice-types` | `notesCustom` | Unclear how calculator aggregates two ice types |
| `tbc-fields` | `installInstructions` | No way to mark a field "provisional, will update" |

## Gap report (deliverable, post-seed)

`docs/plans/2026-05-18-event-sheet-gap-report.md`, structured as:

```
## Event: Heathrow
### Section: Header
  Match: eventName, eventDate, ...
  Gap: venue address concatenated, ...
  Severity: nice-to-have

### Section: Service Summary
  ...
[repeat per section]

## Event: Glasgow
[same structure]

## Severity tally
  Blockers (current schema cannot capture, end-user would notice): N
  Nice-to-haves (workaround visible to user): N
  Accepted workarounds (invisible to user): N

## Recommended follow-up specs
  - Spec A: <smallest cluster of related schema gaps>
  - Spec B: ...
```

Severity definitions:
- **Blocker** — Murdo cannot produce a usable event sheet without manual editing.
- **Nice-to-have** — Workaround is visible in the rendered sheet (e.g. address jammed into one line, host buried in `staffNames`).
- **Accepted workaround** — Workaround is invisible to LC (e.g. ice types aggregated correctly in calculator but stored as text).

## Files touched

- `src/db/seed.ts` — major edits (placeholders replaced with 6 real recipes; standard notes, equipment templates, and 2 events added)
- `docs/plans/2026-05-18-event-sheet-gap-report.md` — new, written after running seed
- `TODOS.md` — strike "Get Murdo's cocktail recipes" once seed lands

## Testing

- `npm run test -- --run` must still pass (no business logic changes, but schema tests may exercise seeded data).
- `npm run build` must pass.
- Manual: `npm run seed` (or equivalent — check `package.json`), then open each event in the UI, generate the event sheet, screenshot, and lay side-by-side with the source PDF in the gap report.

## Risks

- The seed is destructive against `cocktails`, `cocktailIngredients`, `cocktailGarnishes` rows where the placeholder data lives. Local dev DB only — prod is not touched by `seed.ts`.
- Clydeport Celebration's gomme amount is flagged "(check)" in Murdo's PDF — seeded at 10ml, gap report calls this out for confirmation.
- Glasgow's loading bay note ("updated Tuesday") is TBC at PDF time. We capture as TBD in `installInstructions`.
- Some workarounds may turn out to be invisible to the user once rendered, demoting their severity. Some may turn out to be worse. The gap report is where that gets adjudicated.

## What this spec does NOT decide

All of the following are explicitly punted to follow-up specs, informed by the gap report:

- Whether to add multi-line venue address columns
- Whether to add `isHost` flag on `eventContacts` or `staffNames`
- Whether to add a `barBrandingNotes` field on events
- Whether to extend `scalingRuleEnum` with `per_guest`
- Whether to add `eventStock` / `eventSubstitutionStock` tables, or extend `eventEquipment` with a `lineType` enum
- Whether to teach the stock calculator about per-station scaling
- Whether to add stock list category headers in the rendered event sheet
- Whether to add a "provisional" flag on event fields
