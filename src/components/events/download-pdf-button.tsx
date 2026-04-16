"use client";

export function DownloadPDFButton({ eventId }: { eventId: string }) {
  return (
    <a
      href={`/api/events/${eventId}/pdf`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-5 py-2.5 border border-gold text-gold font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold hover:text-cream transition-colors duration-200 min-h-[44px]"
    >
      DOWNLOAD BRIEF
    </a>
  );
}
