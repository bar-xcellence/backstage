// Display formatting for file sizes. Lives here rather than in the component
// so both the Files tab and the new-enquiry quote slot can import it without
// pulling a `"use client"` module (and its server-action imports) into their
// bundle graph. Mirrors address-format.ts.

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  // Anything under 1KB still reads as "1 KB" rather than "0 KB" — a real file
  // is never zero-sized, and rounding down to nothing looks like a bug.
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
