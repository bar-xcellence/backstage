"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { formatFileSize } from "@/lib/file-size-format";

// The quote Murdo emails the client, captured at enquiry time. Uploads to
// private Blob storage immediately on selection and exposes the result as
// hidden form fields, so createEvent can insert the event_files row once the
// event exists (the row needs an eventId that doesn't exist until submit).
//
// Abandoning the form after picking a file orphans the blob — accepted, and
// harmless: the store is private, so an unreferenced blob is unreachable by
// anyone without the store token. Matches recipe-image behaviour.
//
// Owner-only surface: /events/new redirects the partner, and the upload token
// route re-checks the role server-side.
export function QuoteUploadField() {
  const inputRef = useRef<HTMLInputElement>(null);
  // Ref mirror of `uploading` — mirrors event-files.tsx. State updates are
  // async, so the ref is what actually makes a concurrent second upload
  // impossible.
  const uploadingRef = useRef(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    setError(null);
    setUploading(true);
    try {
      const blob = await upload(`event-files/${file.name}`, file, {
        // LOAD-BEARING: `access` cannot be pinned server-side in the upload
        // token — the browser decides it, and the blob's hostname derives from
        // it. This line is the ONLY place these files are made private. This is
        // the quote sent to a client; dropping to "public" would put it on a
        // guessable, unauthenticated URL and bypass /api/event-files/[id]
        // entirely. Do not change without reading the Task 3 findings.
        access: "private",
        handleUploadUrl: "/api/event-files/upload",
      });
      setFileName(file.name);
      setBlobUrl(blob.url);
      setFileSize(file.size);
    } catch (e) {
      setError((e as Error).message || "Upload failed");
    } finally {
      uploadingRef.current = false;
      setUploading(false);
    }
  }

  return (
    <div>
      <label
        htmlFor="quoteFile"
        className="block font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mb-1.5"
      >
        Quote PDF
      </label>

      {/* The file input is the real control: sr-only rather than `hidden` so it
          stays keyboard-focusable and Space/Enter opens the picker natively.
          Both labels are associated with it, so its accessible name reads
          "Quote PDF Click to upload …" — no click-handler-on-a-div needed. */}
      <input
        id="quoteFile"
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only peer"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {blobUrl && fileName ? (
        <div className="flex items-center gap-4 min-h-[44px]">
          <span className="font-[family-name:var(--font-raleway)] text-sm text-charcoal truncate">
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
              inputRef.current?.focus();
            }}
            className="px-2 font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-error hover:underline min-h-[44px] shrink-0 cursor-pointer"
          >
            <span className="sr-only">Remove {fileName}</span>
            <span aria-hidden="true">Remove</span>
          </button>
        </div>
      ) : (
        <label
          htmlFor="quoteFile"
          className="flex items-center justify-center w-full px-3 py-6 bg-surface-low border-b-2 border-outline/15 text-grey font-[family-name:var(--font-raleway)] text-sm cursor-pointer hover:border-gold peer-focus-visible:border-gold transition-colors duration-200 text-center min-h-[44px]"
        >
          {uploading
            ? "Uploading…"
            : "Click to upload the quote you sent the client (PDF, ≤16MB)"}
        </label>
      )}

      <input type="hidden" name="quoteFileName" value={fileName ?? ""} />
      <input type="hidden" name="quoteBlobUrl" value={blobUrl ?? ""} />
      <input type="hidden" name="quoteFileSize" value={fileSize || ""} />

      {error && (
        <p
          role="alert"
          className="mt-2 text-error text-sm font-[family-name:var(--font-raleway)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
