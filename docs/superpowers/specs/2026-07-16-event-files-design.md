# Event Files — Design

**Date:** 2026-07-16
**Status:** Approved
**Requested by:** Murdo

## Problem

Murdo has no place in Backstage to keep the documents that accumulate around each booking:

- The **quote PDF** he emails the client (wants it back at hand during sales negotiation — asked for an upload button on the new-enquiry form specifically).
- **LC's actual invoice PDFs** (arrive by email the day after an event, not payable until end of the following month, get buried in the inbox).
- **Floor plan JPEGs**, **client event-overview PDFs**, **menu PDFs**, and **artwork files** for menu branding.

All three asks are one feature: categorised file attachments per event, owner-only.

## Decisions (made with Rob)

1. **Partner access: none.** The entire feature is invisible to the partner role — files include quotes and LC invoices (financial). No per-category visibility.
2. **Fixed categories:** `quote`, `lc_invoice`, `floor_plan`, `menu`, `artwork`, `other`. Chosen at upload via dropdown; files group under category headings.
3. **New-enquiry form gets one "Quote PDF" upload slot** (create mode only). Everything else uploads from a new Files tab on the event detail page.
4. **Storage: Vercel Blob with `access: 'private'`** — not UploadThing. Financial documents must not be public-by-URL. Recipe images **stay on UploadThing** (they render in brief emails/PDFs, which requires public delivery; Blob docs warn against private access for publicly-served images).

## Architecture

### Schema (`src/db/schema.ts`)

New enum + child table, following the `eventEquipment` pattern:

```
eventFileCategoryEnum: quote | lc_invoice | floor_plan | menu | artwork | other

event_files
  id          uuid pk defaultRandom
  eventId     uuid notNull → events.id, onDelete: cascade
  category    eventFileCategoryEnum notNull
  fileName    text notNull      -- original filename, e.g. "AEO September Quote.pdf"
  blobUrl     text notNull      -- private Vercel Blob URL (used with get()/del())
  fileSize    integer notNull   -- bytes, for display
  uploadedAt  timestamp notNull defaultNow
```

Separate child table ⇒ **no change to `partner-event-projection.ts`**; the pinned
classification test stays green. Isolation is enforced at the action/route layer
(same argument as equipment, but inverted: equipment is partner-visible, files are
owner-only everywhere).

Blob pathname convention: `event-files/{uuid}-{fileName}` (no eventId needed in the
path — the DB row is the link; also lets the new-enquiry form upload before the
event exists).

### Storage & transport (`@vercel/blob`)

New dependency `@vercel/blob`; Blob store connected to the Vercel project
(`BLOB_READ_WRITE_TOKEN`, pulled locally via `vercel env pull`).

- **Upload:** client-side `upload()` from `@vercel/blob/client` with
  `handleUploadUrl: "/api/event-files/upload"`. The route handler's
  `onBeforeGenerateToken` checks the session (owner/super_admin only), pins
  `access: 'private'`, allow-lists content types (`application/pdf`, `image/jpeg`,
  `image/png`) and caps size at 16MB. Client upload bypasses the 4.5MB serverless
  request-body limit (print-ready artwork PDFs can be large).
  **Fallback:** if the installed `@vercel/blob` version does not support private
  client-upload tokens, switch to server-side `put()` inside the same route with a
  4MB cap and note the ceiling in the UI copy.
- **Download:** private blobs are not fetchable by URL. Files are served through an
  authenticated route: `GET /api/event-files/[id]` → session check (owner/super_admin)
  → look up row → `get(blobUrl)` → stream with `Content-Disposition: inline` and the
  stored filename. Links in the UI point at this route and open in a new tab.
- **Delete:** `del(blobUrl)` then delete the DB row.
- **Orphans:** a file uploaded from the new-enquiry form is orphaned in Blob if the
  form is abandoned. Accepted — matches existing recipe-image behaviour. Deleting an
  event cascades the DB rows but leaves blobs behind; `deleteEvent` gains a
  best-effort `del()` of the event's blob URLs before the row delete.

### Server actions (`src/actions/event-files.ts`)

All begin with `requireRole(["owner", "super_admin"])`:

- `addEventFile(eventId, { category, fileName, blobUrl, fileSize })` — validates
  category against the enum and input shape via `validateEventFileInput()` (see
  Testing), inserts row, `revalidatePath("/events/{id}")`.
- `getEventFiles(eventId)` — rows ordered by category then uploadedAt.
- `deleteEventFile(id)` — looks up row, `del(blobUrl)`, deletes row, revalidates.

### UI

**Files tab** — new tab in the existing `EventTabs` on the event detail page,
rendered only inside the `!isPartner` block (defence-in-depth on top of the
owner-gated actions/routes):

- Upload zone at top: category dropdown + click-to-upload (reuses the
  `image-uploader.tsx` interaction pattern, extended for PDF; shows per-file
  progress from `upload()`).
- Files grouped under category headings (utility-label style: 11px, tracked,
  uppercase). Each row: filename (link to the download route, new tab) · size ·
  date · Remove (confirm before delete). JPEG rows get a small thumbnail fetched
  through the download route; PDF rows a document glyph.
- Empty state per house rules: Cormorant heading ("Nothing filed yet"), Raleway
  body ("Quotes, floor plans, LC invoices and menu artwork for this event will
  live here."), gold upload CTA.
- Reserve Noir throughout: no border-radius, 44px touch targets, gold accents.

**New-enquiry form** (`event-form.tsx`, create mode only) — a single "Quote PDF"
field: uploads to Blob immediately on selection (same client `upload()` flow),
holds `{ fileName, blobUrl, fileSize }` in form state; `createEvent` inserts the
`event_files` row with `category: "quote"` after the event row. Edit mode does not
show the field (the Files tab covers post-creation uploads).

## Security summary

| Layer | Enforcement |
|---|---|
| Storage | `access: 'private'` — no public URL exists |
| Upload token | `onBeforeGenerateToken` → session role check |
| Download | authenticated route → `requireRole` before `get()` |
| Actions | `requireRole(["owner", "super_admin"])` first line |
| UI | Files tab + quote slot inside `!isPartner` gating |
| Projection | untouched — separate table, never in the event payload |

## Testing

- **TDD:** `src/lib/event-file-validation.ts` — `validateEventFileInput()` checks
  category allow-list, filename non-empty/sane, size > 0 and ≤ 16MB, extension
  matches category-agnostic allow-list (.pdf/.jpg/.jpeg/.png). Unit tests first.
- Schema test in `src/db/schema.test.ts` for the new table (matches existing style).
- `pnpm build` + manual smoke: upload each category, download, delete, partner
  session sees no tab and gets 403 from the download route.

## Out of scope (YAGNI)

File versioning, drag-and-drop, a cross-event LC-invoice payables view (the
category enum makes it possible later), edit-form uploads, image compression,
migrating recipe images off UploadThing.

## Delivery notes

- No new branch — commit to `main` in logical units (schema → validation lib →
  actions/routes → Files tab → form slot → docs).
- Requires one manual step from Rob: create/connect a Blob store in the Vercel
  dashboard and `vercel env pull` (document in commit message).
