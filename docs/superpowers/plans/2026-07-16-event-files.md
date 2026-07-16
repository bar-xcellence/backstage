# Event Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Categorised file attachments (quote PDFs, LC invoices, floor plans, menus, artwork) per event — owner-only Files tab plus a Quote PDF slot on the new-enquiry form.

**Architecture:** New `event_files` child table (cascade off `events`, like `event_equipment`). Storage is Vercel Blob with a **private** store: browser uploads go direct-to-blob via `@vercel/blob/client` `upload()` with a role-checked token route; downloads stream through an authenticated route handler using `get()`. Partner role never sees any of it (actions, routes, and UI all gated).

**Tech Stack:** Next.js 16.2 App Router, Drizzle + NeonDB, `@vercel/blob` ≥ 2.3 (new dependency), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-16-event-files-design.md`

**Branch:** none — commit to `main` per task (user's explicit instruction).

---

## Prerequisite (manual, Rob) — Blob store

Before Task 3 can be verified end-to-end:

1. `vercel blob create-store backstage-files --access private` (or dashboard: project → Storage → Create Database → Blob → access **Private**), connected to the backstage project.
2. Copy the generated `BLOB_READ_WRITE_TOKEN` into `.env.local` (don't `vercel env pull` blindly — it overwrites `.env.local`).

Everything except live upload/download verification works without this (build, tests, lint).

---

### Task 1: `event_files` schema

**Files:**
- Modify: `src/db/schema.ts`
- Test: `src/db/schema.test.ts`

- [ ] **Step 1: Write the failing schema test**

In `src/db/schema.test.ts`, add `eventFiles` to the existing import from `./schema`, and add inside the top-level `describe("Database Schema", ...)`:

```ts
  describe("event_files table", () => {
    it("has required columns", () => {
      const columns = Object.keys(eventFiles);
      expect(columns).toContain("id");
      expect(columns).toContain("eventId");
      expect(columns).toContain("category");
      expect(columns).toContain("fileName");
      expect(columns).toContain("blobUrl");
      expect(columns).toContain("fileSize");
      expect(columns).toContain("uploadedAt");
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run src/db/schema.test.ts`
Expected: FAIL — `"eventFiles" is not exported`.

- [ ] **Step 3: Add enum, table, relations to `src/db/schema.ts`**

Add the enum next to the other `pgEnum`s (top of file):

```ts
export const eventFileCategoryEnum = pgEnum("event_file_category", [
  "quote",
  "lc_invoice",
  "floor_plan",
  "menu",
  "artwork",
  "other",
]);
```

Add the table after the `eventEquipment` table (uses already-imported `uuid`, `text`, `integer`, `timestamp`):

```ts
// ── Event Files ───────────────────────────────────────
// Owner-only documents (quotes, LC invoices, floor plans, menus, artwork)
// stored in a PRIVATE Vercel Blob store. Never partner-visible — enforced in
// actions/routes, not via partner-event-projection (separate table).

export const eventFiles = pgTable("event_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  category: eventFileCategoryEnum("category").notNull(),
  fileName: text("file_name").notNull(),
  blobUrl: text("blob_url").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});
```

In `eventsRelations`, add `files: many(eventFiles),` alongside `equipment: many(eventEquipment),`. Then add after `eventEquipmentRelations`:

```ts
export const eventFilesRelations = relations(eventFiles, ({ one }) => ({
  event: one(events, {
    fields: [eventFiles.eventId],
    references: [events.id],
  }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --run src/db/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Push schema to Neon**

drizzle-kit does NOT auto-load `.env.local`:

```bash
set -a; source .env.local; set +a; npx drizzle-kit push
```

Expected: adds `event_file_category` enum + `event_files` table. Verify with the printed summary.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/schema.test.ts
git commit -m "feat: add event_files table for per-event document storage"
```

---

### Task 2: Validation helper (TDD)

**Files:**
- Create: `src/lib/event-file-validation.ts`
- Test: `src/lib/event-file-validation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/event-file-validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  validateEventFileInput,
  MAX_EVENT_FILE_BYTES,
  EVENT_FILE_CATEGORIES,
  EVENT_FILE_CATEGORY_LABELS,
} from "./event-file-validation";

const valid = {
  category: "quote",
  fileName: "AEO September Quote.pdf",
  blobUrl:
    "https://abc123.private.blob.vercel-storage.com/event-files/AEO-x1y2.pdf",
  fileSize: 800_200,
};

describe("validateEventFileInput", () => {
  it("accepts a valid quote PDF", () => {
    expect(validateEventFileInput(valid)).toEqual([]);
  });

  it("accepts every category and image extensions", () => {
    for (const category of EVENT_FILE_CATEGORIES) {
      expect(validateEventFileInput({ ...valid, category })).toEqual([]);
    }
    for (const fileName of ["plan.jpg", "plan.JPEG", "plan.png"]) {
      expect(validateEventFileInput({ ...valid, fileName })).toEqual([]);
    }
  });

  it("rejects an unknown category", () => {
    expect(
      validateEventFileInput({ ...valid, category: "contract" })
    ).toContain("Invalid category");
  });

  it("rejects an empty file name", () => {
    expect(validateEventFileInput({ ...valid, fileName: "  " })).toContain(
      "File name is required"
    );
  });

  it("rejects disallowed extensions", () => {
    expect(
      validateEventFileInput({ ...valid, fileName: "quote.docx" })
    ).toContain("Only PDF, JPG and PNG files are allowed");
    expect(
      validateEventFileInput({ ...valid, fileName: "noextension" })
    ).toContain("Only PDF, JPG and PNG files are allowed");
  });

  it("rejects a non-https blob URL", () => {
    expect(
      validateEventFileInput({ ...valid, blobUrl: "http://evil.example/x.pdf" })
    ).toContain("Invalid file URL");
  });

  it("rejects zero, negative and oversized file sizes", () => {
    const sizeError = "File must be between 1 byte and 16MB";
    expect(validateEventFileInput({ ...valid, fileSize: 0 })).toContain(sizeError);
    expect(validateEventFileInput({ ...valid, fileSize: -5 })).toContain(sizeError);
    expect(
      validateEventFileInput({ ...valid, fileSize: MAX_EVENT_FILE_BYTES + 1 })
    ).toContain(sizeError);
  });

  it("has a display label for every category", () => {
    for (const category of EVENT_FILE_CATEGORIES) {
      expect(EVENT_FILE_CATEGORY_LABELS[category]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run src/lib/event-file-validation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/event-file-validation.ts`**

```ts
// Pure validation for event file uploads. Kept out of the server action so it
// can be TDD'd and shared by createEvent's quote slot.

export const EVENT_FILE_CATEGORIES = [
  "quote",
  "lc_invoice",
  "floor_plan",
  "menu",
  "artwork",
  "other",
] as const;

export type EventFileCategory = (typeof EVENT_FILE_CATEGORIES)[number];

export const EVENT_FILE_CATEGORY_LABELS: Record<EventFileCategory, string> = {
  quote: "Quote",
  lc_invoice: "LC Invoice",
  floor_plan: "Floor Plan",
  menu: "Menu",
  artwork: "Artwork",
  other: "Other",
};

export const MAX_EVENT_FILE_BYTES = 16 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export interface EventFileInput {
  category: string;
  fileName: string;
  blobUrl: string;
  fileSize: number;
}

export function validateEventFileInput(input: EventFileInput): string[] {
  const errors: string[] = [];

  if (!EVENT_FILE_CATEGORIES.includes(input.category as EventFileCategory)) {
    errors.push("Invalid category");
  }

  const name = input.fileName?.trim() ?? "";
  if (!name) {
    errors.push("File name is required");
  } else {
    const dot = name.lastIndexOf(".");
    const ext = dot === -1 ? "" : name.slice(dot).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      errors.push("Only PDF, JPG and PNG files are allowed");
    }
  }

  if (!input.blobUrl?.startsWith("https://")) {
    errors.push("Invalid file URL");
  }

  if (
    !Number.isFinite(input.fileSize) ||
    input.fileSize <= 0 ||
    input.fileSize > MAX_EVENT_FILE_BYTES
  ) {
    errors.push("File must be between 1 byte and 16MB");
  }

  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run src/lib/event-file-validation.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/event-file-validation.ts src/lib/event-file-validation.test.ts
git commit -m "feat: event file validation helper (TDD)"
```

---

### Task 3: Install `@vercel/blob` + upload token route

**Files:**
- Modify: `package.json` (via pnpm)
- Create: `src/app/api/event-files/upload/route.ts`

- [ ] **Step 1: Install the SDK**

```bash
pnpm add @vercel/blob
```

Expected: `@vercel/blob` ≥ 2.3 in `package.json` dependencies (private storage requires ≥ 2.3 — check the installed version in the lockfile output).

- [ ] **Step 2: Create the client-upload token route**

Create `src/app/api/event-files/upload/route.ts`:

```ts
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { MAX_EVENT_FILE_BYTES } from "@/lib/event-file-validation";

// Token exchange for direct browser→Blob uploads (bypasses the 4.5MB
// serverless body limit). The store is PRIVATE, so uploaded blobs are never
// publicly reachable; downloads go through /api/event-files/[id].
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getSession();
        if (
          !session ||
          (session.role !== "owner" && session.role !== "super_admin")
        ) {
          throw new Error("Unauthorized");
        }

        return {
          allowedContentTypes: ["application/pdf", "image/jpeg", "image/png"],
          maximumSizeInBytes: MAX_EVENT_FILE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.userId }),
        };
      },
      onUploadCompleted: async () => {
        // DB rows are inserted by the client calling addEventFile() after
        // upload() resolves — this webhook can't reach localhost in dev, so
        // we deliberately don't rely on it.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/app/api/event-files/upload/route.ts
git commit -m "feat: private Blob client-upload token route for event files"
```

---

### Task 4: Server actions

**Files:**
- Create: `src/actions/event-files.ts`

- [ ] **Step 1: Create `src/actions/event-files.ts`**

```ts
"use server";

import { db } from "@/db";
import { eventFiles } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { del } from "@vercel/blob";
import { requireRole } from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
  validateEventFileInput,
  type EventFileCategory,
  type EventFileInput,
} from "@/lib/event-file-validation";

export async function addEventFile(
  eventId: string,
  input: EventFileInput
): Promise<{ errors?: string[] }> {
  await requireRole("owner", "super_admin");

  const errors = validateEventFileInput(input);
  if (errors.length > 0) return { errors };

  await db.insert(eventFiles).values({
    eventId,
    category: input.category as EventFileCategory,
    fileName: input.fileName.trim(),
    blobUrl: input.blobUrl,
    fileSize: input.fileSize,
  });

  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function getEventFiles(eventId: string) {
  await requireRole("owner", "super_admin");

  return db
    .select()
    .from(eventFiles)
    .where(eq(eventFiles.eventId, eventId))
    .orderBy(asc(eventFiles.uploadedAt));
}

export async function deleteEventFile(
  id: string
): Promise<{ error?: string }> {
  await requireRole("owner", "super_admin");

  const [file] = await db
    .select()
    .from(eventFiles)
    .where(eq(eventFiles.id, id))
    .limit(1);

  if (!file) return { error: "File not found" };

  try {
    await del(file.blobUrl);
  } catch {
    // Blob already gone — still remove the row.
  }

  await db.delete(eventFiles).where(eq(eventFiles.id, id));
  revalidatePath(`/events/${file.eventId}`);
  return {};
}
```

Note `requireRole("owner", "super_admin")` deliberately excludes `partner` in ALL THREE actions — this table holds quotes and LC invoices.

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/event-files.ts
git commit -m "feat: owner-gated event file server actions"
```

---

### Task 5: Authenticated download route

**Files:**
- Create: `src/app/api/event-files/[id]/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/event-files/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventFiles } from "@/db/schema";
import { getSession } from "@/lib/session";

// Private blobs have no fetchable URL — this route is the only read path.
// Auth is checked here, right next to get(), per Vercel's guidance (never
// rely on middleware alone for private blob delivery).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "owner" && session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [file] = await db
    .select()
    .from(eventFiles)
    .where(eq(eventFiles.id, id))
    .limit(1);

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const result = await get(file.blobUrl, { access: "private" });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Disposition": `inline; filename="${file.fileName.replace(/"/g, "'")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
    },
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: no errors. (If the installed `@vercel/blob` types name the stream/blob properties differently, follow the type error — the ≥2.3 API is `{ statusCode, stream, blob: { contentType, etag } }`.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/event-files/[id]/route.ts"
git commit -m "feat: authenticated download route for private event files"
```

---

### Task 6: Files tab UI + event page wiring

**Files:**
- Create: `src/components/events/event-files.tsx`
- Modify: `src/app/(authenticated)/events/[id]/page.tsx`

- [ ] **Step 1: Create `src/components/events/event-files.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { addEventFile, deleteEventFile } from "@/actions/event-files";
import {
  EVENT_FILE_CATEGORIES,
  EVENT_FILE_CATEGORY_LABELS,
  type EventFileCategory,
} from "@/lib/event-file-validation";

interface EventFileRow {
  id: string;
  category: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function isImage(fileName: string): boolean {
  return /\.(jpe?g|png)$/i.test(fileName);
}

export function EventFiles({
  eventId,
  files,
}: {
  eventId: string;
  files: EventFileRow[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<EventFileCategory>("quote");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const blob = await upload(`event-files/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/event-files/upload",
      });
      const result = await addEventFile(eventId, {
        category,
        fileName: file.name,
        blobUrl: blob.url,
        fileSize: file.size,
      });
      if (result.errors?.length) setError(result.errors.join(", "));
    } catch (e) {
      setError((e as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(file: EventFileRow) {
    if (!window.confirm(`Remove "${file.fileName}"? This cannot be undone.`)) {
      return;
    }
    const result = await deleteEventFile(file.id);
    if (result.error) setError(result.error);
  }

  const grouped = EVENT_FILE_CATEGORIES.map((cat) => ({
    category: cat,
    items: files.filter((f) => f.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      {/* Upload zone */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div>
          <label
            htmlFor="event-file-category"
            className="block font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mb-1.5"
          >
            Category
          </label>
          <select
            id="event-file-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as EventFileCategory)}
            className="min-h-[44px] px-3 bg-surface-low border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:border-gold outline-none"
          >
            {EVENT_FILE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {EVENT_FILE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="min-h-[44px] px-6 bg-gold text-charcoal font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 cursor-pointer"
        >
          {uploading ? "Uploading…" : "Upload file"}
        </button>
        <p className="font-[family-name:var(--font-raleway)] text-xs text-grey sm:mb-3">
          PDF, JPG or PNG, up to 16MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="text-error text-sm font-[family-name:var(--font-raleway)]">
          {error}
        </p>
      )}

      {/* File list */}
      {files.length === 0 ? (
        <div className="py-10 text-center">
          <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-charcoal tracking-tight mb-2">
            Nothing filed yet
          </h3>
          <p className="font-[family-name:var(--font-raleway)] text-sm text-grey max-w-md mx-auto">
            Quotes, floor plans, LC invoices and menu artwork for this event
            will live here. Upload the first document above.
          </p>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.category}>
            <h3 className="font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.16em] uppercase text-grey border-b border-outline/15 pb-2 mb-3">
              {EVENT_FILE_CATEGORY_LABELS[group.category]}
            </h3>
            <ul className="space-y-2">
              {group.items.map((file) => (
                <li key={file.id} className="flex items-center gap-4 min-h-[44px]">
                  {isImage(file.fileName) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/event-files/${file.id}`}
                      alt=""
                      className="w-11 h-11 object-cover border border-outline/15 shrink-0"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="w-11 h-11 flex items-center justify-center border border-outline/15 text-grey text-[10px] font-[family-name:var(--font-raleway)] tracking-[0.16em] shrink-0"
                    >
                      PDF
                    </span>
                  )}
                  <a
                    href={`/api/event-files/${file.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-[family-name:var(--font-raleway)] text-sm text-charcoal hover:text-gold-ink underline decoration-gold/40 underline-offset-4 transition-colors duration-200 truncate"
                  >
                    {file.fileName}
                  </a>
                  <span className="font-[family-name:var(--font-raleway)] text-xs text-grey shrink-0">
                    {formatFileSize(file.fileSize)} ·{" "}
                    {new Date(file.uploadedAt).toLocaleDateString("en-GB")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(file)}
                    className="ml-auto font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-error hover:underline min-h-[44px] shrink-0 cursor-pointer"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `src/app/(authenticated)/events/[id]/page.tsx`**

Add imports:

```ts
import { getEventFiles } from "@/actions/event-files";
import { EventFiles } from "@/components/events/event-files";
```

Add to the `Promise.all` destructuring (after `eventNotes`) — keep positions matched:

```ts
    eventNotes,
    files,
  ] = await Promise.all([
    // ...existing fetchers unchanged...
    getEventStandardNotes(id),
    isPartner ? Promise.resolve([]) : getEventFiles(id),
  ]);
```

In the `tabs` array, inside the existing `...(!isPartner ? [...] : [])` block, add before the `edit` entry:

```ts
        { id: "files", label: `Files (${files.length})` },
```

In the `<EventTabs>` children, inside the existing `...(!isPartner ? { ... } : {})` block, add alongside `checklist:`:

```tsx
            files: <EventFiles eventId={id} files={files} />,
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

Manual (needs `BLOB_READ_WRITE_TOKEN` in `.env.local`): `pnpm dev`, open an event as owner → Files tab → upload a PDF as "Quote" → appears under Quote heading → filename link opens the PDF in a new tab → Remove deletes it. Log in as partner (or check a partner session) → no Files tab; `GET /api/event-files/<id>` returns 403.

- [ ] **Step 4: Commit**

```bash
git add src/components/events/event-files.tsx "src/app/(authenticated)/events/[id]/page.tsx"
git commit -m "feat: owner-only Files tab on event detail"
```

---

### Task 7: Quote PDF slot on the new-enquiry form

**Files:**
- Create: `src/components/events/quote-upload-field.tsx`
- Modify: `src/components/events/event-form.tsx`
- Modify: `src/app/(authenticated)/events/new/page.tsx`
- Modify: `src/actions/events.ts` (createEvent)

- [ ] **Step 1: Create `src/components/events/quote-upload-field.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { formatFileSize } from "@/components/events/event-files";

// Uploads the quote to private Blob storage immediately on selection and
// exposes the result as hidden form fields, so createEvent can insert the
// event_files row after the event exists. Abandoning the form orphans the
// blob — accepted, matches recipe-image behaviour.
export function QuoteUploadField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const blob = await upload(`event-files/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/event-files/upload",
      });
      setFileName(file.name);
      setBlobUrl(blob.url);
      setFileSize(file.size);
    } catch (e) {
      setError((e as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mb-1.5">
        Quote PDF
      </label>

      {blobUrl && fileName ? (
        <div className="flex items-center gap-4 min-h-[44px]">
          <span className="font-[family-name:var(--font-raleway)] text-sm text-charcoal">
            {fileName}{" "}
            <span className="text-grey text-xs">
              ({formatFileSize(fileSize)})
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setFileName(null);
              setBlobUrl(null);
              setFileSize(0);
            }}
            className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-error hover:underline min-h-[44px] cursor-pointer"
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="w-full px-3 py-6 bg-surface-low border-b-2 border-outline/15 text-grey font-[family-name:var(--font-raleway)] text-sm cursor-pointer hover:border-gold transition-colors duration-200 text-center"
        >
          {uploading
            ? "Uploading…"
            : "Click to upload the quote you sent the client (PDF, ≤16MB)"}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <input type="hidden" name="quoteFileName" value={fileName ?? ""} />
      <input type="hidden" name="quoteBlobUrl" value={blobUrl ?? ""} />
      <input type="hidden" name="quoteFileSize" value={fileSize || ""} />

      {error && (
        <p className="mt-2 text-error text-sm font-[family-name:var(--font-raleway)]">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render it in `event-form.tsx` behind a prop**

In `src/components/events/event-form.tsx`:

Add to imports: `import { QuoteUploadField } from "@/components/events/quote-upload-field";`

Extend the props interface and destructuring:

```ts
interface EventFormProps {
  action: (formData: FormData) => Promise<{ errors?: string[] } | void>;
  defaultValues?: Record<string, string | number | null>;
  submitLabel?: string;
  showQuoteUpload?: boolean;
}
```

(and `showQuoteUpload = false,` in the destructuring at the function head.)

Add a new section immediately before the submit button block (before the element containing the `{loading ? "SAVING..." : submitLabel}` button):

```tsx
      {showQuoteUpload && (
        <section>
          <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-4">
            Quote
          </h2>
          <QuoteUploadField />
        </section>
      )}
```

- [ ] **Step 3: Pass the prop on the new-event page**

In `src/app/(authenticated)/events/new/page.tsx`, change:

```tsx
      <EventForm action={createEvent} showQuoteUpload />
```

(The edit tab on the event detail page passes nothing, so the field never renders there — the Files tab covers post-creation uploads.)

- [ ] **Step 4: Insert the quote row in `createEvent`**

In `src/actions/events.ts`:

Add to imports: `eventFiles` in the existing `@/db/schema` import, and:

```ts
import { validateEventFileInput } from "@/lib/event-file-validation";
```

In `createEvent`, between `.returning({ id: events.id });` and `revalidatePath("/events");`, add:

```ts
  // Quote uploaded on the new-enquiry form (Spec: event files). Invalid or
  // missing quote metadata never blocks event creation — worst case Murdo
  // re-uploads from the Files tab.
  const quoteBlobUrl = (formData.get("quoteBlobUrl") as string) || null;
  if (quoteBlobUrl) {
    const quoteInput = {
      category: "quote",
      fileName: (formData.get("quoteFileName") as string) || "",
      blobUrl: quoteBlobUrl,
      fileSize: Number(formData.get("quoteFileSize")) || 0,
    };
    if (validateEventFileInput(quoteInput).length === 0) {
      await db.insert(eventFiles).values({
        eventId: event.id,
        category: "quote",
        fileName: quoteInput.fileName.trim(),
        blobUrl: quoteInput.blobUrl,
        fileSize: quoteInput.fileSize,
      });
    }
  }
```

- [ ] **Step 5: Verify**

Run: `pnpm typecheck && pnpm test -- --run`
Expected: clean, all tests pass.

Manual: `/events/new` → fill required fields → upload a quote PDF → CREATE EVENT → lands on the event detail → Files tab shows `Files (1)` with the quote under the Quote heading.

- [ ] **Step 6: Commit**

```bash
git add src/components/events/quote-upload-field.tsx src/components/events/event-form.tsx "src/app/(authenticated)/events/new/page.tsx" src/actions/events.ts
git commit -m "feat: quote PDF upload slot on the new-enquiry form"
```

---

### Task 8: Blob cleanup on event deletion

**Files:**
- Modify: `src/actions/events.ts` (deleteEvent)

- [ ] **Step 1: Delete blobs before the row cascade**

In `deleteEvent` in `src/actions/events.ts`, add `del` to imports (`import { del } from "@vercel/blob";`) and insert immediately before `await db.delete(events).where(eq(events.id, id));`:

```ts
  // FK cascade removes the event_files rows but not the blobs — delete those
  // first, best-effort (a failed storage delete must not block event deletion).
  const files = await db
    .select({ blobUrl: eventFiles.blobUrl })
    .from(eventFiles)
    .where(eq(eventFiles.eventId, id));
  if (files.length > 0) {
    try {
      await del(files.map((f) => f.blobUrl));
    } catch {
      // Orphaned blobs are acceptable; rows still cascade.
    }
  }
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm test -- --run`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/actions/events.ts
git commit -m "feat: delete event blobs when an event is deleted"
```

---

### Task 9: Docs, build, final verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a CLAUDE.md section**

Add under Conventions (after the Settings/Spec J section), following the existing per-spec style:

```markdown
### Event files (uploads per event)
Owner/super_admin attach documents to events — quote PDFs, LC invoice PDFs, floor plan JPEGs, menus, artwork. Partner (Rory) never sees any of it: quotes and LC invoices are financial.

- `event_files` child table (cascade off `events`; separate table, so NOT classified in `partner-event-projection.ts`), `category` enum: `quote | lc_invoice | floor_plan | menu | artwork | other`.
- Storage: **private** Vercel Blob store (`BLOB_READ_WRITE_TOKEN`; `@vercel/blob` ≥ 2.3). Browser uploads go direct-to-blob via `upload()` + role-checked token route `/api/event-files/upload`; downloads only via the authenticated `/api/event-files/[id]` route (session check next to `get()`). Recipe images stay on UploadThing — they must be publicly fetchable for brief emails/PDFs.
- Actions in `src/actions/event-files.ts` (`addEventFile`/`getEventFiles`/`deleteEventFile`) — all `requireRole("owner", "super_admin")`. Validation is the pure `validateEventFileInput()` in `src/lib/event-file-validation.ts` (TDD).
- UI: Files tab on event detail (inside `!isPartner`), grouped by category; `quote-upload-field.tsx` gives the new-enquiry form a Quote PDF slot (`showQuoteUpload` prop, create only) — `createEvent` inserts the row after the event.
- `deleteEvent` best-effort `del()`s the event's blobs before the row cascade; `deleteEventFile` also removes the blob.
```

- [ ] **Step 2: Full verification**

```bash
pnpm test -- --run && pnpm build
```

Expected: all tests pass, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record event files feature in CLAUDE.md"
```

---

## Verification checklist (post-implementation smoke)

Requires the Blob store prerequisite. As owner on `pnpm dev`:

1. `/events/new` → upload quote PDF → create → Files tab shows it under Quote.
2. Files tab → upload a JPEG as Floor Plan → thumbnail renders, link opens image.
3. Remove a file → confirm → gone from list (and from Blob store — check dashboard Browser).
4. Partner check: partner session has no Files tab, no quote slot (no `/events/new` access at all), and `GET /api/event-files/<id>` → 403.
5. Delete a deletable event that has files → no orphan blobs in the store.
