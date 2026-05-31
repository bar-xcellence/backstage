"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

export function ImageUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/recipes/upload",
      });
      onChange(blob.url);
    } catch (e) {
      setError((e as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mb-1.5">
        Reference image
      </label>

      {value ? (
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Reference"
            className="w-32 h-40 object-cover border border-outline/15"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="font-[family-name:var(--font-raleway)] text-[11px] tracking-[0.16em] uppercase text-error hover:underline min-h-[44px]"
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="w-full px-3 py-6 bg-surface-low border-b-2 border-outline/15 text-grey font-[family-name:var(--font-raleway)] text-sm cursor-pointer hover:border-gold transition-colors duration-200 text-center"
        >
          {uploading ? "Uploading…" : "Click to upload an image (JPG/PNG/WebP, ≤5MB)"}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="mt-2 text-error text-sm font-[family-name:var(--font-raleway)]">
          {error}
        </p>
      )}
    </div>
  );
}
