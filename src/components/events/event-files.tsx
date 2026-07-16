"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { addEventFile, deleteEventFile } from "@/actions/event-files";
import { formatFileSize } from "@/lib/file-size-format";
import {
  EVENT_FILE_CATEGORIES,
  EVENT_FILE_CATEGORY_LABELS,
  MAX_EVENT_FILE_BYTES,
  type EventFileCategory,
} from "@/lib/event-file-validation";

// Owner-only surface. The page gates both this panel and its tab on
// !isPartner, and every action/route behind it re-checks the role server-side.

interface EventFileRow {
  id: string;
  category: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
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
  // Ref mirror of `uploading`: the disabled button is the primary guard, but
  // state updates are async, so a ref is what actually makes a second call
  // impossible if one slips through before the re-render.
  const uploadingRef = useRef(false);
  const [category, setCategory] = useState<EventFileCategory>("quote");
  const [uploading, setUploading] = useState(false);
  // A 16MB artwork PDF on venue wifi takes long enough that a static
  // "Uploading…" reads as a hang — and a reload orphans the blob.
  const [progress, setProgress] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<EventFileRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (uploadingRef.current) return;
    setError(null);

    // Check before uploading, not after: the token caps size server-side, but
    // hitting that means pushing the whole file first and getting an SDK error
    // back. Menu artwork is routinely over the limit.
    if (file.size > MAX_EVENT_FILE_BYTES) {
      setError(
        `${file.name} is ${formatFileSize(file.size)} — the limit is ${formatFileSize(MAX_EVENT_FILE_BYTES)}.`
      );
      return;
    }

    uploadingRef.current = true;
    setUploading(true);
    setProgress(0);
    try {
      const blob = await upload(`event-files/${file.name}`, file, {
        onUploadProgress: ({ percentage }) => setProgress(percentage),
        // LOAD-BEARING: `access` cannot be pinned server-side in the upload
        // token — the browser decides it, and the blob's hostname derives from
        // it. This line is the ONLY place these files are made private. These
        // are quotes and LC invoices; dropping to "public" would put them on a
        // guessable, unauthenticated URL and bypass /api/event-files/[id]
        // entirely. Do not change without reading the Task 3 findings.
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
      uploadingRef.current = false;
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteEventFile(pendingDelete.id);
      if (result.error) setError(result.error);
    } catch {
      setError("Something went wrong removing this file. Please try again.");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
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
          className="px-6 py-2.5 bg-gold-ink text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
        >
          {uploading ? `Uploading… ${Math.round(progress)}%` : "Upload file"}
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
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {error && (
        <p
          role="alert"
          className="text-error text-sm font-[family-name:var(--font-raleway)]"
        >
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
            Quotes, floor plans, LC invoices and menu artwork for this event will
            live here. Pick a category and upload the first document above.
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
                <li
                  key={file.id}
                  className="flex items-center gap-4 min-h-[44px]"
                >
                  {/* The icon links to the same file as the name and opens a
                      new tab too — clicking the thumbnail is the natural
                      gesture. aria-hidden + tabIndex -1 so it's a mouse
                      convenience, not a duplicate/unlabelled link for
                      keyboard and screen-reader users; the filename link
                      beside it is the real, labelled control. */}
                  <a
                    href={`/api/event-files/${file.id}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-hidden="true"
                    tabIndex={-1}
                    className="shrink-0"
                  >
                    {isImage(file.fileName) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/event-files/${file.id}`}
                        alt=""
                        className="w-11 h-11 object-cover border border-outline/15 hover:border-gold transition-colors duration-200"
                      />
                    ) : (
                      <span className="w-11 h-11 flex items-center justify-center border border-outline/15 text-grey text-[10px] font-[family-name:var(--font-raleway)] tracking-[0.16em] hover:border-gold transition-colors duration-200">
                        PDF
                      </span>
                    )}
                  </a>
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
                    onClick={() => setPendingDelete(file)}
                    className="ml-auto px-2 font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-error hover:underline min-h-[44px] shrink-0 cursor-pointer"
                  >
                    <span className="sr-only">Remove {file.fileName}</span>
                    <span aria-hidden="true">Remove</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {/* Confirm removal — matches DeleteEventButton's modal rather than a
          browser confirm(), which is off-style and unreachable to Playwright. */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm remove file"
        >
          <div
            className="absolute inset-0 bg-charcoal/85 backdrop-blur-[20px]"
            onClick={() => !deleting && setPendingDelete(null)}
          />
          <div className="relative w-full max-w-md bg-charcoal/95 backdrop-blur-[20px] border border-cream/10 p-6">
            <p className="font-[family-name:var(--font-raleway)] text-[10px] font-semibold tracking-[0.2em] uppercase text-error mb-2">
              Remove file
            </p>
            <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-cream tracking-tight mb-3">
              Remove &ldquo;{pendingDelete.fileName}&rdquo;?
            </h2>
            <p className="font-[family-name:var(--font-raleway)] text-sm text-cream/70 leading-relaxed mb-6">
              This permanently deletes the document from storage. This cannot be
              undone.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="flex-1 px-5 py-3 border border-cream/20 text-cream/60 font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:text-cream hover:border-cream/40 transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-5 py-3 bg-error text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-error/80 transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                {deleting ? "Removing…" : "Remove permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
