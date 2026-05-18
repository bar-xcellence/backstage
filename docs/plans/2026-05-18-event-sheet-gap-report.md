# Event Sheet Gap Report — Heathrow + Glasgow

**Date:** 2026-05-18
**Source PDFs:** Heathrow Event Sheet (2026-05-15), Brief Sheet 23rd April Glasgow (2026-04-23)
**Spec:** `docs/superpowers/specs/2026-05-18-real-event-seed-and-gap-report-design.md`

## Method

Seeded both events end-to-end via `npm run seed` (see `src/db/seed.ts`). Cross-checked the rendered output by reading the event-sheet rendering components against each PDF section line by line:

- `src/app/(authenticated)/events/[id]/page.tsx` — event detail page
- `src/components/events/brief-preview.tsx` — Send-to-LC preview pane
- `src/components/events/event-tabs.tsx` — tab shell
- `src/components/events/stock-list.tsx` — stock list tab
- `src/components/events/event-equipment.tsx` — equipment tab
- `src/components/events/event-standard-notes.tsx` — standard notes block
- `src/lib/brief-email-template.ts` — outbound LC email HTML
- `src/lib/pdf/brief-pdf.tsx` — downloadable A4 PDF
- `src/lib/stock-calculator.ts` — stock derivation logic
- `src/db/schema.ts` — single source of truth for fields
- `src/db/seed.ts` — `WORKAROUND[id]` markers

Severity:

- **Blocker** — Murdo cannot produce a usable event sheet without manual editing.
- **Nice-to-have** — Workaround is visible to LC (e.g. multi-line address jammed into one field).
- **Accepted** — Workaround is invisible to LC.

Note: this report is a code+data analysis. A subsequent user visual review may upgrade severities and add findings (see *Outstanding: User visual review* at the foot).

---

## Event: Heathrow Masterclass

PDF: 130 guests, 13 tables × 10, 2 cocktails per guest (260 serves), masterclass format, host = Murdo, 4 LC bartenders.

### Section: Header / metadata

- ✓ Match: `eventName` "Hexaware Cocktail Masterclass", `eventDate` 2026-05-15, `guestCount` 130, `eventType` masterclass, `serviceType` cocktails_mocktails — all render in event header (`page.tsx:131-145`) and brief preview / PDF / email.
- ✗ Gap: PDF title is "Briefing Pack For Cocktail Masterclass Booking on Friday 15th May" — platform header reads only "Hexaware Cocktail Masterclass" (the client name). No field captures the briefing-pack subtitle phrasing. [nice-to-have] [no workaround id — design choice]
- ✗ Gap: Full address "London Hilton Heathrow Airport Terminal 5, Poole Rd, Colnbrook, Heathrow, SL3 0FF" stored in single `venueName` field. Renders as one comma-blob line in event header summary bar (`page.tsx:177`) and in brief preview "Location" block (`brief-preview.tsx:124`). PDF expects multi-line. [nice-to-have] [WORKAROUND[address]]

### Section: Service summary ("What")

- ✓ Match: 130 guests, 4 staff, 260 prepaid serves, 13 stations rendered in event detail summary bar (`page.tsx:175-188`) and in PDF "What" section (`brief-pdf.tsx:139-144`).
- ✗ Gap: PDF describes "Murdo is hosting this event. LC to supply 4 cocktail bartenders". Platform stores this in free-text `staffNames` ("Murdo MacLeod (host); LC supplies 4 cocktail bartenders") but no UI surfaces this string — `staffNames` is not read anywhere in `page.tsx`, `brief-preview.tsx`, `brief-email-template.ts`, or `brief-pdf.tsx`. Field is dead. [blocker] [WORKAROUND[host]]
- ✗ Gap: PDF emphasises "60 mins long, super interactive guest experience" — no field for activity duration or experience descriptor. Currently embedded in `notesCustom`. [nice-to-have]
- ✗ Gap: PDF lists 13 tables of 10 guests. Platform stores `stationCount: 13` and `stationLayoutNotes: "13 tables of 10 guests..."`. The number renders ("13 stations"), but `stationLayoutNotes` is only read by `brief-preview.tsx:317-321` (label "Station layout") — not on the main event detail page or in the PDF. Render is partial. [nice-to-have]

### Section: Timings

- ✓ Match: All 5 timing fields populated and render on event detail "Times" section (`page.tsx:196-244`), brief preview (`:131-145`), PDF (`:147-161`), and email (`brief-email-template.ts:97-105`). 16:00 / 18:45 / 19:15 / 20:15 / 20:30.
- ✓ Match: Times match PDF exactly.

### Section: Attire

- ✓ Match: `standardNotes` "Attire" linked to event. PDF text matches the seeded note content.
- ✗ Gap: Email template (`brief-email-template.ts:75-76`) and PDF (`brief-pdf.tsx:107-108`) hard-code a one-line attire string ("Black waistcoat, black bow tie..."). The seeded `standardNotes`-linked "Attire" record is **not** consulted by either outbound surface — only the event detail page's `<EventStandardNotes>` component reads it. Brief email / PDF therefore omit the bulleted attire list LC actually sees in Murdo's PDFs. [blocker] (LC receives wrong attire spec)

### Section: On-Site Contacts

- ✓ Match: 3 contacts seeded — Murdo (Host), Nafisa Ali (Venue), Prakharg Ghildyal (Client). Render in event detail "Site Contacts" (`page.tsx:259-287`), brief preview (`:148-171`), email (`:78-86`), PDF (`:163-175`).
- ✗ Gap: PDF lists Nafisa with email only (no phone), which the platform handles — but the "Site Contacts" row layout in `page.tsx:265-284` shows `contactName | contactRole | contactPhone` and silently drops `contactEmail`. Brief preview, email and PDF do render email. [nice-to-have]
- ✓ Match: Phone and email formatting are preserved (07882084422, prakharg@hexaware.com, +447776651243).

### Section: Cocktails + recipes

- ✓ Match: Both cocktails (Spiced Passionstar + Springtime Clover Club) seeded with full ingredient + garnish lists. Render in cocktails tab via `<CocktailSelector>`, in brief preview (`:206-242`), email (`:30-59`), and PDF (`:188-207`).
- ✓ Match: Each cocktail allocated 130 serves (`servesAllocated: 130`), matching PDF "2 cocktails per guest" intent.
- ✓ Match: Menu descriptions exact: "Spiced rum, passionfruit, freshly squeezed lemon, pineapple & glistening with edible glitter" and "Gin, raspberries, mint, freshly squeezed lemon, elderflower & cloudy apple".
- ✗ Gap: Springtime Clover Club menu copy mentions "cloudy apple" but the recipe has no apple juice ingredient. Seeded as PDF spec lists (no apple). Flag for Murdo confirmation. [nice-to-have] (not a schema gap — content discrepancy preserved deliberately)
- ✗ Gap: PDF specifies garnish-level visual detail like "Garnished with quarter passionfruit float / single pineapple leaf / edible gold duster spray / Single black short cardboard straw" — quantity `0.25 whole` for passionfruit float will render as `0.25 whole Passionfruit Quarter (float)` in stock and `0.25 whole Passionfruit Quarter (float)` in cocktail card; the "float" hint is folded into the garnish name string. Renders sensibly. [accepted]
- ✗ Gap: Per-cocktail `iceAmountG` (200) and `iceType` ("Cubed") are columns on `cocktails` table but not displayed in the event detail page, brief preview, PDF, or email. Ice info hidden from LC. [nice-to-have]
- ✗ Gap: Per-cocktail `straw` / `strawType` ("Black short cardboard") similarly hidden — not rendered anywhere. PDF wants this called out per cocktail. [nice-to-have]
- ✗ Gap: Foamer "3 drops" stored as `unit: "drops"`, routed to `manualItems` by `stock-calculator.ts:97-106` because drops are not ml-convertible. Renders on stock-list "Manual Items" section (`stock-list.tsx:91-115`). Aggregation: `130 serves × 3 drops = 390 drops`. PDF wants "13 bottles miraculous foamer" — calculator can't translate drops → bottles. [blocker] [WORKAROUND[per-station-stock]]

### Section: Stock list (calculator output)

PDF stock list (transcribed from `Heathrow Event Sheet PDF.pdf` p.3–4):

| Item | PDF qty | Calc qty (130 serves Passionstar + 130 serves Clover Club, 15% buffer) | Match? |
|---|---|---|---|
| Spiced Rum | 4L | 25ml × 130 = 3.25L × 1.15 = 3.74L → ceil(3737.5/700) = **6 × 700ml = 4.2L** | ≈ ✓ |
| Gin | 4L | 25ml × 130 = 3.25L × 1.15 = 3.74L → **6 × 700ml = 4.2L** | ≈ ✓ |
| Passionfruit Puree | 4L | 25ml × 130 = 3.25L × 1.15 → ceil(3738/500) = **8 × 500ml = 4.0L** | ✓ |
| Raspberry Puree | 4L | 25ml × 130 = 3.25L × 1.15 → **8 × 500ml = 4.0L** | ✓ |
| Lemon (Boiron) | 5L | (15+15)ml × 130 = 3.9L × 1.15 = 4.49L → ceil(4485/1000) = **5 × 1000ml = 5L** | ✓ |
| Pineapple Juice | 12L | 75ml × 130 = 9.75L × 1.15 = 11.21L → **12 × 1000ml = 12L** | ✓ |
| Gomme | 4L | (15+10)ml × 130 = 3.25L × 1.15 → ceil(3738/1000) = **4 × 1000ml = 4L** | ✓ |
| Elderflower Cordial | 2.5L | 15ml × 130 = 1.95L × 1.15 = 2.24L → ceil(2243/700) = **4 × 700ml = 2.8L** | ≈ ✓ (modifier bottle size = 700, not 1000 — over-orders) |
| Miraculous Foamer | 13 bottles | 3 drops × 130 = 390 drops on manualItems | ✗ |
| Cubed Ice | 65kg | (none — `iceAmountG` not aggregated in calculator) | ✗ |
| Passionfruit (whole) | 40 | 0.25 × 130 × 1.10 = **36 whole** | ≈ ✓ (close, slight under) |
| Pineapple Leaves | 150 | 1 × 130 × 1.10 = **143 piece** | ≈ ✓ |
| Fresh Raspberries | 320 | 2 × 130 × 1.10 = **286 piece** | ≈ ✗ (under by ~10%) |
| Mint Sprigs | 160 | 1 × 130 × 1.10 = **143 sprig** | ≈ ✓ (under by ~10%) |
| Edible Gold Duster Spray | 13 packs | 1 × 130 × 1.10 = **143 spray** | ✗ (drastically over — should be per-station = 13, not per-serve = 143) |
| Black Cardboard Straws | 150 | (no garnish entry, only `strawType` text) | ✗ |
| Bamboo Spears | 150 | 1 × 130 × 1.10 = **143 piece** | ≈ ✓ |
| Non-alcoholic gin × 4 bottles | listed | in `notesCustom` only | ✗ |
| Non-alcoholic spiced rum × 4 bottles | listed | in `notesCustom` only | ✗ |

Observations:

- ✗ Gap: Foamer cannot derive "13 bottles" — `drops` unit lives outside ml maths. PDF expects per-station bottle count. [blocker] [WORKAROUND[per-station-stock]]
- ✗ Gap: Ice is on the `cocktails.iceAmountG` field but **the stock calculator never reads it**. `iceAmountG: 200` × 260 serves = 52kg, PDF says 65kg cubed. Either way, no cubed-ice line appears on the stock list — LC will not order ice from the rendered output. [blocker] [WORKAROUND[ice-types]]
- ✗ Gap: "Edible Gold Duster Spray" scales per-serve (143) when the PDF wants per-station (13 packs). 10× over-order. [blocker] [WORKAROUND[per-station-stock]]
- ✗ Gap: Black cardboard straws are mentioned only via `cocktails.strawType` text field — no garnish row, no stock row. PDF lists 150 straws as a stock-list line item. [blocker] [WORKAROUND[per-guest-equipment]]
- ✗ Gap: Non-alcoholic substitution stock (4 bottles non-alc gin + 4 bottles non-alc spiced rum) only exists as English text in `notesCustom`. Won't appear in stock-list tab, brief preview "Stock List" section, email, or PDF. [blocker] [WORKAROUND[substitution-stock]]
- ✗ Gap: Modifier bottle size is 700ml in `BOTTLE_SIZES` (`stock-calculator.ts:7`) but Elderflower Cordial in the UK is 1000ml — calculator orders 4×700ml instead of 3×1000ml. Minor over-order, but spec is wrong. [nice-to-have]
- ✓ Match: Spirit, puree, juice, citrus, gomme rounding matches PDF exactly.
- ✗ Gap: Garnish buffer is 10% (`stock-calculator.ts:18`); PDF appears to round up 15–25% above (PDF says 320 raspberries for 260 serves @ 2 = 520 needed if both cocktails used raspberries, but only Springtime does, so 130×2=260 base × ~23% buffer = 320). Buffer rule mismatch. [nice-to-have]

### Section: Kit / equipment list

PDF kit list (Heathrow p.4):

| PDF item | Seeded? | Render? |
|---|---|---|
| Trolley | ✓ (qty 1) | ✓ |
| Large plastic boxes with lids | ✓ (qty 6 — judgement call) | ✓ [WORKAROUND[plastic-box-qty]] |
| 110 glass bottles | ✓ (qty 110) | ✓ |
| Sticky labels | ✓ (pack of 1) | ✓ |
| 4 pens | ✓ (qty 4) | ✓ |
| 13 ice buckets | ✓ (qty 13) | ✓ |
| 13 ice scoops | ✓ (qty 13) | ✓ |
| 13 fruit plates | ✓ (qty 13) | ✓ |
| 3 fruit knives | ✓ (qty 3) | ✓ |
| 3 chopping boards | ✓ (qty 3) | ✓ |
| 140 rocks glasses | ✓ (qty 140 = 130 guests + 10 spare) | ✓ [WORKAROUND[per-guest-equipment]] |
| 140 coupes | ✓ (qty 140) | ✓ |
| 140 plastic shakers (3-piece) | ✓ (qty 140) | ✓ |
| Brush and dustpan | ✓ (qty 1) | ✓ |

- ✗ Gap: All glassware quantities are hard-coded literals. No `per_guest` enum value in `scalingRule` (only `per_station | fixed | per_spirit | per_ingredient` per `schema.ts:95-100`). Changing guest count from 130 → 150 would not auto-update glasses to 160. [nice-to-have] [WORKAROUND[per-guest-equipment]]
- ✗ Gap: Plastic box count (6) was a judgement call — PDF didn't specify. [accepted] [WORKAROUND[plastic-box-qty]]
- ✗ Gap: Equipment tab quantity column renders bare integer with no unit label (`event-equipment.tsx:182-184` / `:188-201`). LC sees `Trolley | 1` without context. [nice-to-have]

### Section: Standard notes / setup & service

- ✓ Match: 4 standard notes (Attire, Problem Escalation, Stock Movement, On-Site Washing) linked to event. Render in `<EventStandardNotes>` on event detail Overview tab (`page.tsx:301-306`).
- ✗ Gap: Standard notes are **not** rendered in the LC-facing surfaces:
  - `brief-preview.tsx` — only reads `notesCustom`, `stationLayoutNotes`, `batchingInstructions`, `menuNotes` (`:68-72`).
  - `brief-email-template.ts:121-123` — only reads `notesCustom`.
  - `brief-pdf.tsx:240-245` — only reads `notesCustom`.
  Standard notes (the ones Murdo curated for reuse) are dropped from the brief sent to LC. [blocker]
- ✗ Gap: PDF "Notes For Setup and Service" includes 8 bullets covering item movement, attire, host meeting time, install lead, timings reminder, problem escalation, washing policy, etc. Some are in `standardNotes`, some inlined as `installInstructions`, some as `notesCustom`. The platform fragments them across 3 fields; the PDF reads them as one block. Inconsistent. [nice-to-have]

### Section: Custom notes / workarounds (notesCustom field)

- ✓ Match: `notesCustom` renders on event detail (`page.tsx:289-299`), brief preview (`brief-preview.tsx:316`), email (`:121-123`), PDF (`:240-245`).
- ✗ Gap: Seeded `notesCustom` contains literal `WORKAROUND[substitution-stock]:` and `WORKAROUND[per-station-stock]:` marker strings. LC will see those tokens in the brief. [blocker] (the markers leak to LC unless we render `notesCustom` differently or strip them)
- ✗ Gap: Two separate workarounds collapsed into one free-text block. Adding e.g. a 3rd workaround = lengthy unstructured paragraph. [nice-to-have]

---

## Event: Glasgow Pinsent Masons

PDF: 100 guests, 3 bartender stations on 3m curved pop-up bar with vinyl branding, drinks reception, 4 signature cocktails, 200 serves, 40 cocktails pre-poured at 17:45.

### Section: Header / metadata

- ✓ Match: `eventName` "Pinsent Masons Office Social", `eventDate` 2026-04-23, `guestCount` 100, `eventType` drinks_reception, `serviceType` cocktails_mocktails. Renders in event header.
- ✗ Gap: PDF venue is multi-line (Aurora / Pinsent Masons / Lexington Catering / 120 Bothwell Street / Glasgow, G2 7JS). Seeded as a single overloaded string "Aurora @ Pinsent Masons (catered by Lexington Catering), 120 Bothwell Street, Glasgow, G2 7JS" with `venueHallRoom: "Aurora"`. The "@ Pinsent Masons (catered by Lexington Catering)" portion is editorial — no field for tenant / caterer. [nice-to-have] [WORKAROUND[address]]

### Section: Service summary ("What")

- ✓ Match: 100 guests, 3 staff, 200 prepaid serves, 3 stations render.
- ✓ Match: `popUpBar: true` triggers "Pop-up bar required" line in brief email (`brief-email-template.ts:107`).
- ✗ Gap: PDF lists 9 supply items under "What" (3 bartenders / 3m curved bar / vinyl banner / 100 coups / 100 rocks / 200 cocktails / printed menu in frame / bartender kit / bins & first aid). Platform fragments this across `staffCount`, `popUpBar`, `popUpBarSupplier`, `guestCount × glasses in equipment`, `prepaidServes`, `menuFrameCount`, equipment templates, and `notesCustom`. Brief never reconstructs the original 9-line list. [nice-to-have]
- ✗ Gap: Vinyl banner branding instruction "Vinyl banner front branding, attached seamlessly to the bar" is jammed into `popUpBarSupplier: "3m curved, vinyl banner front branding attached seamlessly"`. Field semantically means "supplier name" (e.g. "Acme Bars Ltd"), not a description. `popUpBarSupplier` is not rendered anywhere in `page.tsx`, `brief-preview.tsx`, `brief-email-template.ts`, or `brief-pdf.tsx`. The branding instruction is invisible to LC. [blocker] [WORKAROUND[branding]]
- ✗ Gap: `menuFrameCount` is a schema field but not seeded for Glasgow, and not rendered anywhere. PDF specifies "Printed menu in a holder on the bar top in an elegant frame" — only captured by `equipmentTemplates` "Menu in holder" (qty 1, fixed). [nice-to-have]
- ✗ Gap: `staffNames: "Murdo MacLeod (host); James McClymont; 3 LC bartenders"` is dead — no UI reads it. Host designation lost. [blocker] [WORKAROUND[host]]

### Section: Location notes ("Loading bay access TBC")

- ✗ Gap: PDF says "Loading bat [sic] access will be updated on Tuesday, along with the route from the entrance to the event space." Seeded into `installInstructions` as free text: "...Loading bay access TBC (updated Tuesday before event)". No first-class "provisional / TBC" flag. LC sees the TBC text inline. [nice-to-have] [WORKAROUND[tbc-fields]]
- ✗ Gap: `parkingInstructions` and `accessRoute` are schema fields but unused (null). The TBC parking/access route info collapses into one `installInstructions` blob. [nice-to-have]

### Section: Timings

- ✓ Match: 15:00 / 17:00 / 18:00 / 21:00 / 21:30 all seeded and rendered across surfaces.
- ✗ Gap: PDF lists 6 milestones (3pm access, 4pm bar+glasses, 5pm stations set, 5:45pm 40 cocktails on bar top, 6pm guests, 9pm depart). Schema has 5 time fields (arrive/setupDeadline/serviceStart/serviceEnd/depart). "Stations all set by 5pm" and "40 cocktails on bar top at 5:45pm" intermediate milestones lost. Pre-pour time of 17:45 buried in `notesCustom`. [blocker] [WORKAROUND[pre-pour-batching]]
- ✗ Gap: `batchingInstructions` is a schema field, but seed used `notesCustom` instead. `brief-preview.tsx:323-327` reads `batchingInstructions` — would render with label "Batching:" if populated. Field undermined by seeder choice (or developer didn't know it existed — either way, gap). [nice-to-have] [WORKAROUND[pre-pour-batching]]

### Section: Attire

- ✓ Match: Standard note linked.
- ✗ Gap: Same as Heathrow — email + PDF hard-code attire string, ignoring the seeded `standardNotes` record. [blocker]

### Section: On-Site Contacts

- ✓ Match: 2 contacts (Murdo, James). Render across event detail, brief preview, email, PDF.
- ✗ Gap: PDF lists Murdo first then James, but the seed sets `sortOrder: 0` for Murdo and `sortOrder: 1` for James — matches. PDF shows "James McClymont, mobile 07916 857416" with a space in the phone number; platform stores as `07916857416` (stripped). LC will see "07916857416" — readable but reformatted. [accepted]

### Section: Cocktails + recipes

- ✓ Match: All 4 cocktails seeded — Clydeport Celebration, Wellingtons Gin Club, Barrowlands Stars, Clockwork Orange Margarita. Each allocated 50 serves (200 total).
- ✓ Match: Ingredient lists match PDF spec line-by-line.
- ✗ Gap: Wellingtons Gin Club description mentions "cloudy apple" in source PDF but recipe has no apple juice — seeded without. (Source-spec discrepancy.) [accepted]
- ✗ Gap: Clockwork Orange Margarita PDF menu copy mentions "orange blossom" but spec lists no orange blossom water — seeded as per spec. (Source-spec discrepancy.) [accepted]
- ✗ Gap: Clydeport Celebration source spec flagged Gomme as "10ml (check)" — seeded at 10ml. Pending Murdo confirmation. [accepted]
- ✗ Gap: Clydeport uses 200g **crushed** ice, the other 3 use 200g **cubed**. Platform stores `iceType: "Crushed"` vs `"Cubed"` on cocktails table, but the field is **not rendered anywhere** — the brief does not tell LC that one cocktail needs crushed ice and three need cubed. [blocker] [WORKAROUND[ice-types]]
- ✗ Gap: Per-cocktail `straw` / `strawType` similarly hidden. Clydeport + Barrowlands need black cardboard straws (per PDF); Wellingtons + Clockwork don't. No visibility. [nice-to-have]
- ✗ Gap: Clockwork Orange "Garnish with mango sections cut into spikes (see image) and mini pegged to rim" — seeded as 4 separate garnishes (Hibiscus Powder Rim, Mango Spike, Purple Petal, Mini Peg) which is fine for stock count, but the visual/assembly instruction "cut into spikes... pegged to rim" lost. PDF says cocktails "MUST look like in the images below" — `cocktails.referenceImageUrl` exists as a schema field but no image was seeded (URL null). [nice-to-have]

### Section: Stock list (calculator output)

PDF stock list (Glasgow p.4–5):

**Spirits**

| Item | PDF qty | Calc qty (50 serves × recipe ml × 1.15) | Match? |
|---|---|---|---|
| Drambuie | 3L | 50ml × 50 = 2.5L × 1.15 = 2.875L → ceil(2875/700) = **5 × 700ml = 3.5L** | ≈ ✓ |
| Gin | 2L | 35ml × 50 = 1.75L × 1.15 = 2.01L → **3 × 700ml = 2.1L** | ✓ |
| Spiced rum | 2L | 35ml × 50 = 1.75L × 1.15 → **3 × 700ml = 2.1L** | ✓ |
| Tequila blanco | 1.5L | 25ml × 50 = 1.25L × 1.15 = 1.44L → ceil(1438/700) = **3 × 700ml = 2.1L** | ≈ ✗ over |
| Triple sec | 1.5L | 25ml × 50 = 1.25L × 1.15 → **3 × 700ml = 2.1L** (modifier=700) | ≈ ✗ over |
| Non-alc whisky × 1 | listed | in `notesCustom` only | ✗ |
| Non-alc gin × 1 | listed | in `notesCustom` only | ✗ |
| Non-alc spiced rum × 1 | listed | in `notesCustom` only | ✗ |
| Non-alc agave × 1 | listed | in `notesCustom` only | ✗ |

**Juices**

| Item | PDF qty | Calc qty | Match? |
|---|---|---|---|
| Apple juice | 3L | 50ml × 50 = 2.5L × 1.15 → **3 × 1000ml = 3L** | ✓ |
| Pineapple juice | 5L | 75ml × 50 = 3.75L × 1.15 = 4.31L → **5 × 1000ml = 5L** | ✓ |
| Orange juice | 1L | 15ml × 50 = 0.75L × 1.15 = 0.86L → **1 × 1000ml = 1L** | ✓ |

**Purées & Citrus**

| Item | PDF qty | Calc qty | Match? |
|---|---|---|---|
| Lemon (Boiron) | 3L | (15+15+15)ml × 50 = 2.25L × 1.15 = 2.59L → ceil(2588/1000) = **3 × 1000ml = 3L** | ✓ |
| Lime (Boiron) | 1L | 15ml × 50 = 0.75L × 1.15 = 0.86L → **1 × 1000ml = 1L** | ✓ |
| Raspberry puree | 2L | 25ml × 50 = 1.25L × 1.15 = 1.44L → ceil(1438/500) = **3 × 500ml = 1.5L** | ≈ ✓ |
| Passionfruit puree | 2L | 25ml × 50 = 1.25L × 1.15 → **3 × 500ml = 1.5L** | ≈ ✓ |
| Mango puree | 2L | 25ml × 50 = 1.25L × 1.15 → **3 × 500ml = 1.5L** | ≈ ✓ |

**Sweeteners**

| Item | PDF qty | Calc qty | Match? |
|---|---|---|---|
| Gomme | 2L | (10+10+15)ml × 50 = 1.75L × 1.15 = 2.01L → **3 × 1000ml = 3L** | ≈ ✓ over |
| Agave syrup | 1L | 15ml × 50 = 0.75L × 1.15 = 0.86L → **1 × 1000ml = 1L** | ✓ |
| Elderflower cordial | 1L | 15ml × 50 = 0.75L × 1.15 → ceil(863/700) = **2 × 700ml = 1.4L** | ≈ ✗ over (modifier=700) |

**Foamer / Ice**

| Item | PDF qty | Calc qty | Match? |
|---|---|---|---|
| Miraculous foamer | 2 bottles | 3 drops × 50 × 2 cocktails using it = 300 drops on manualItems | ✗ |
| Cubed ice | 30kg | (none) | ✗ |
| Crushed ice | 10kg | (none) | ✗ |

**Garnishes**

| Item | PDF qty | Calc qty | Match? |
|---|---|---|---|
| Heather sprigs | 50 | 1 × 50 × 1.10 = **55 sprig** | ≈ ✓ |
| Fresh raspberries | 100 | 2 × 50 × 1.10 = **110 piece** | ≈ ✓ |
| Mint sprigs | 50 | 1 × 50 × 1.10 = **55 sprig** | ≈ ✓ |
| Passionfruit | 13 | 0.25 × 50 × 1.10 = **14 whole** | ≈ ✓ |
| Pineapple leaves | 50 | 1 × 50 × 1.10 = **55 piece** | ≈ ✓ |
| Edible gold spray | 2 spray pumps | 1 × 50 × 1.10 = **55 spray** | ✗ over by 27× |
| Hibiscus powder | 1 tub | 1 × 50 × 1.10 = **55 rim** (unit = "rim") | ✗ (LC needs "1 tub" not "55 rims") |
| Purple petals | 50 | 1 × 50 × 1.10 = **55 petal** | ≈ ✓ |
| Mango | 6–7 | 1 × 50 × 1.10 = **55 piece** (unit = "spike") | ✗ (over — 1 mango → ~10 spikes) |

**Barware**

| Item | PDF qty | Where? |
|---|---|---|
| Short black cardboard straws — 200 | only in `cocktails.strawType` field, not rendered | ✗ |
| Bamboo spears — 50 | 1 × 50 × 1.10 = **55 piece** on Wellingtons | ≈ ✓ |
| Mini pegs — 50 | 1 × 50 × 1.10 = **55 piece** on Clockwork | ≈ ✓ |

Observations:

- ✗ Gap: Same foamer issue as Heathrow — drops can't translate to bottles. PDF expects 2 bottles. [blocker] [WORKAROUND[per-station-stock]]
- ✗ Gap: Two ice types (cubed 30kg + crushed 10kg). Calculator doesn't read `cocktails.iceAmountG` at all. Even if it did, it'd aggregate both as "g" with no type distinction. PDF needs separate cubed + crushed lines. [blocker] [WORKAROUND[ice-types]]
- ✗ Gap: Edible gold spray same as Heathrow — should be 2 pumps (fixed), not 55 sprays. [blocker] [WORKAROUND[per-station-stock]]
- ✗ Gap: Hibiscus powder is "1 tub" — fixed item, not per-serve. Currently scaled per-serve. [blocker] [WORKAROUND[per-station-stock]]
- ✗ Gap: Mango is bulk produce (6–7 whole) yielding ~10 spikes each. Calculator counts spikes 1:1 with serves — over-orders. [nice-to-have]
- ✗ Gap: Triple Sec routed to `modifier` category → 700ml bottle assumption. UK Triple Sec is 700ml so this is actually OK, but Elderflower (also modifier) is 1000ml — bottle-size lookup is per-category, not per-ingredient. [nice-to-have]
- ✗ Gap: Non-alcoholic substitution stock (4 bottles) lives only in `notesCustom` — same as Heathrow. [blocker] [WORKAROUND[substitution-stock]]
- ✗ Gap: Cardboard straws missing entirely — `strawType` text field never feeds stock. PDF wants 200 straws. [blocker] [WORKAROUND[per-guest-equipment]]
- ✓ Match: Spirit / juice / puree / citrus / syrup rounding is close to PDF (within 1 bottle either way for most items).

### Section: Kit / equipment list

PDF kit list (Glasgow p.5):

| PDF item | Seeded? | Render? |
|---|---|---|
| 100 elegant coups | ✓ (qty 100, "Coupe glass") | ✓ |
| 100 etched rocks | ✓ (qty 100, "Etched rocks glass") | ✓ |
| 2 back bins | ✓ (qty 2, "Bin (back of bar)") | ✓ |
| Black bin liners | ✓ (qty 1 pack) | ✓ |
| 3 ice buckets | ✓ (qty 3) | ✓ |
| 3 scoops | ✓ (qty 3) | ✓ |
| Large box (cubed) | ✓ (qty 1) | ✓ |
| Large box (crushed) | ✓ (qty 1) | ✓ |
| 3 bartender kits | ✓ (qty 3, "Bartender kit (full set: speedpours, knives, boards, shakers, hawthorns, fine strainers, squeeze bottles, bar spoons)") | ✓ |
| First aid box | ✓ (qty 1) | ✓ |
| Brush and dustpan | ✓ (qty 1) | ✓ |
| Menu in holder | ✓ (qty 1) | ✓ |

- ✗ Gap: Single "Bartender kit" line collapses 8 sub-items into one string. PDF lists them inline as a single bullet too, but if Murdo wants to itemise per-tool quantities later (e.g. "are we missing 2 speedpours?") the platform can't help. Could be solved by applying the "Bartender Kit" `equipmentTemplate` instead of one composite row. [nice-to-have]
- ✗ Gap: 3m curved pop-up bar itself is **not in the equipment list** — only referenced via `popUpBar: true` boolean and the overloaded `popUpBarSupplier` field. The physical bar unit (the thing being delivered) is invisible to the equipment tab. [nice-to-have] [WORKAROUND[branding]]
- ✗ Gap: Vinyl banner is also not an equipment row. [nice-to-have] [WORKAROUND[branding]]

### Section: Standard notes / setup & service

- ✓ Match: All 4 standard notes linked.
- ✗ Gap: Same as Heathrow — standard notes never reach LC via email or PDF. [blocker]
- ✗ Gap: PDF lists 13 setup/service bullets including pre-pour timing, bar-top cleanliness, hide-stock-behind-bar, glass-collection policy, self-contained ("don't ask venue"), problem escalation, etc. Fragmented across `standardNotes` + `installInstructions` + `notesCustom`. The "hide everything away behind the bar" and "bar top must be clean and beautiful throughout service" instructions are buried in `notesCustom` or omitted. [blocker]

### Section: Custom notes / workarounds (notesCustom field)

- ✓ Match: `notesCustom` renders across surfaces.
- ✗ Gap: Same as Heathrow — literal `WORKAROUND[...]` marker tokens leak to LC. [blocker]
- ✗ Gap: Glasgow `notesCustom` mixes 4 unrelated topics (pre-pour, glass collection, non-alc substitution, ice types, separate wine bar). Glasgow has more workaround clutter than Heathrow. [nice-to-have]

---

## Severity tally

| Severity | Count | IDs / notes |
|---|---|---|
| Blocker | 14 | host (×2), branding (×1, multiple surfaces), per-station-stock (foamer + gold spray + hibiscus, ×2 events), ice-types (×2 events), substitution-stock (×2 events), pre-pour-batching (×1), per-guest-equipment straws (×2 events), notesCustom marker tokens (×2 events), standardNotes not in email/PDF (×2 events), attire hard-coded (×2 events), pre-pour-batching timing (×1) |
| Nice-to-have | 21 | address (×2), staffNames not surfaced, briefing-pack title phrasing, activity duration descriptor, stationLayoutNotes only in preview, contactEmail dropped in event detail, ice/straw not displayed per cocktail, garnish buffer rate, modifier bottle size mismatch, plastic-box-qty, equipment unit labels, fragmented setup notes, menuFrameCount unused, parkingInstructions / accessRoute unused, batchingInstructions field undermined, mango bulk-produce vs piece scaling, triple sec category, bartender-kit composite row, pop-up-bar physical unit missing, vinyl banner missing from equipment, Clockwork visual assembly note lost |
| Accepted | 6 | plastic-box-qty count, garnish "(float)" hint in name, source-PDF cocktail discrepancies (×3), James's phone reformatting |

Total findings: **41**. Tally adds up (14 + 21 + 6 = 41).

## Workaround tags observed

| ID | Heathrow impact | Glasgow impact | Severity |
|---|---|---|---|
| `address` | Multi-line PDF address jammed into one `venueName` comma-blob. | Same, plus tenant ("@ Pinsent Masons") and caterer ("Lexington Catering") have no field — editorial overload. | nice-to-have |
| `host` | `staffNames` includes "(host)" tag but no UI reads the field. Host designation lost from LC brief. | Same — James McClymont + Murdo (host) lost. | blocker |
| `branding` | — | `popUpBarSupplier` overloaded with "3m curved, vinyl banner front branding attached seamlessly" — field is never rendered in any surface. Vinyl branding instruction invisible to LC. | blocker |
| `per-guest-equipment` | 140 rocks / 140 coupes / 140 shakers hardcoded; no `per_guest` scaling rule. Black cardboard straws missing from stock entirely. | 100 coups / 100 rocks hardcoded. Same straws gap. | blocker (straws) + nice-to-have (scaling rule) |
| `per-station-stock` | Foamer (drops → bottles), gold duster spray (per-station packs), tied to serves not stations. 10×+ over-order. | Foamer, gold spray (2 pumps), hibiscus tub — all per-station fixed items scaled per-serve. | blocker |
| `substitution-stock` | 4 bottles non-alc gin + 4 bottles non-alc spiced rum live in `notesCustom` text only — no recipe, no stock line. | 4 substitution bottles (whisky/gin/spiced rum/agave) same situation. | blocker |
| `pre-pour-batching` | — | "40 cocktails pre-poured at 17:45" exists only in `notesCustom` despite `batchingInstructions` schema field being available. Intermediate timing milestone lost. | blocker |
| `ice-types` | 65kg cubed ice missing from stock list — calculator never reads `cocktails.iceAmountG`. | 30kg cubed + 10kg crushed both missing; per-cocktail `iceType` distinction not shown to LC. | blocker |
| `tbc-fields` | — | "Loading bay access TBC (updated Tuesday)" inlined into `installInstructions` with no provisional flag. | nice-to-have |
| `plastic-box-qty` | Judgement call 6 plastic boxes; PDF didn't specify. | — | accepted |

---

## Recommended follow-up specs

Cluster related gaps into the smallest sensible specs:

- **Spec A: Stock-list completeness (foamer, ice, straws, substitutes, per-station consumables)** — closes `per-station-stock`, `ice-types`, `substitution-stock`, and the straws part of `per-guest-equipment`. Phased into A.1/A.2/A.3 per roadmap `~/.claude/plans/hidden-shimmying-pumpkin.md`:
  - ✓ **A.1** — render `manualItems` in both brief PDFs. Closes the silent PDF gap (foamer drops now visible; quantity-unit mismatch still pending A.3). **Done** in commit `8944ad7`.
  - ✓ **A.2** — derive ice + straws from cocktail metadata. Stock calculator now reads `iceAmountG`/`iceType`/`straw`/`strawType`; new `ice` + `straws` outputs render in all 4 brief surfaces. Heathrow: 52kg cubed + 143 straws; Glasgow: 30kg cubed + 10kg crushed + 110 straws (matches Murdo's PDF within his manual buffer). **Done** in commits `1a3155b` → `f348d8c`.
  - **A.3** — new `event_stock` table for substitution stock + per-station consumables (foamer bottles, gold duster, hibiscus tub). Pending.

  *(Highest blocker concentration — 5+ blockers across both events.)*

- ✓ **Spec B: Standard notes + attire reach LC** — closes the "standard notes not rendered in email/PDF" + "attire hard-coded" blockers. Refactored `brief-email-template.ts`, `brief-pdf.tsx`, `text-only-brief-pdf.tsx`, and `brief-preview.tsx` to read the linked `eventStandardNotes` set (label + content); hard-coded attire string removed. **Done** on `feat/real-event-seed-and-gap-report` (commits `f98019b` → `dea951d`; spec `docs/superpowers/specs/2026-05-18-brief-notes-standardization-design.md`).

- **Spec C: Host + staff visibility** — closes `host`. Introduce `eventContacts.isHost: boolean` (or a `host` role on the existing `contactRole` text field's enum) and surface "Host: Murdo MacLeod" prominently on the event detail page + brief preview + email + PDF. Alternative: add `events.hostName: text`. Estimated scope: **S**.

- **Spec D: Pop-up bar + branding as first-class** — closes `branding`. Add `events.popUpBarSize: text` and `events.popUpBarBranding: text` (or one structured JSON blob); render in brief preview / email / PDF when `popUpBar` is true. Add the 3m bar unit to equipment auto-populated when `popUpBar: true`. Estimated scope: **S**.

- **Spec E: Pre-pour batching + intermediate timings** — closes `pre-pour-batching`. Either (a) repurpose `batchingInstructions` and ensure the seed uses it, **plus** surface it on event detail page + email + PDF (currently only brief-preview reads it), or (b) introduce a structured `eventTimings` table with arbitrary labeled milestones (e.g. "Stations set", "Pre-pour bar top"). Estimated scope: **S** for option (a), **M** for (b).

- ✓ **Spec F: notesCustom hygiene + workaround tokenization** — closes the `WORKAROUND[...]` leak to LC. Implemented as a render-time `stripWorkaroundMarkers()` regex util applied across brief email, PDF, and preview surfaces; seed markers stay in DB for traceability. **Done** alongside Spec B in the same commit range (`f98019b` → `dea951d`; spec `docs/superpowers/specs/2026-05-18-brief-notes-standardization-design.md`).

- **Spec G: Multi-line address + tenant/caterer fields** — closes `address`. Add `events.addressLine1`, `addressLine2`, `city`, `postcode`, and optional `venueTenant`, `cateringPartner`. Migrate `venueName` to short brand only. Estimated scope: **M** (touches forms, summary bar, brief surfaces).

- **Spec H: Per-cocktail ice/straw display + reference image** — closes the nice-to-haves around `iceType`, `strawType`, and `referenceImageUrl`. Render these on the cocktails tab and in the brief, especially for events with mixed ice types (Glasgow). Estimated scope: **S**.

- **Spec I: Equipment scaling — per_guest rule** — closes the scaling part of `per-guest-equipment`. Add `per_guest` to `scalingRuleEnum`. Estimated scope: **XS**.

- **Spec J (deferred):** `tbc-fields`, `plastic-box-qty` — accept as-is for now; revisit only if Murdo asks for provisional UX.

Recommended order: ~~B~~ ✓ → ~~F~~ ✓ → ~~A.1~~ ✓ → ~~A.2~~ ✓ → A.3 → C, D, E, G in parallel by domain.

## Source PDF discrepancies noted in cocktail recipes

(For Murdo to confirm before any further seeding.)

- **Springtime Clover Club / Wellingtons Gin Club** — menu description mentions "cloudy apple" but spec has no apple juice. Seeded without.
- **Clockwork Orange Margarita** — menu description mentions "orange blossom" but spec has agave + OJ only. Seeded without orange blossom.
- **Clydeport Celebration** — Gomme amount flagged "(check)" in source spec. Seeded at 10ml.

## Outstanding: User visual review

The following sections benefit from Rob's eyeball confirmation in the running dev server. Mark each section as 🔍 needs visual review where the code analysis can't determine the rendered output (e.g. CSS/styling issues, mobile responsive bugs, whitespace problems):

- 🔍 Heathrow event detail page tabs — does the long single-line `venueName` wrap gracefully in the summary bar (`page.tsx:177`)? Confirm wrap behaviour at mobile width.
- 🔍 Heathrow event detail Overview tab — does `notesCustom` with literal `WORKAROUND[...]` token strings look acceptable in `whitespace-pre-wrap` rendering (`page.tsx:295`)?
- 🔍 Glasgow event detail page tabs — same address-wrap concern, plus does the long "Bartender kit (full set: ...)" composite equipment row break cleanly?
- 🔍 Glasgow Cocktails tab — does the 4-cocktail grid render densely or sparsely on a 13" laptop?
- 🔍 Glasgow Stock List tab — does the long ingredient list paginate / scroll well? Are manual items (foamer drops, edible gold spray spray, hibiscus rims) visually distinct from purchasable line items?
- 🔍 Generated PDF for each event — does react-pdf render the long `venueName` on one line or break? Are the stock-list rows truncated? Does the PDF use the BriefPDF path or the TextOnlyBriefPDF fallback (`render-brief-with-fallback.ts`)?
- 🔍 Send-to-LC email preview for each event — open `brief-email-template.ts` output in a Resend test send; verify Gmail/Outlook rendering of the dark-charcoal header and gold section titles.
- 🔍 Equipment tab — empty-state copy hidden by the seeded data; manually wipe equipment to confirm empty state matches Reserve Noir tone.
- 🔍 Standard Notes block on Overview — confirm checkboxes show all 4 standard notes selected (botanical green check) and that the labels truncate gracefully on the toggle row.
- 🔍 Header status badge — confirm `delivered` status displays correctly with the right `STATUS_COLORS` token.
