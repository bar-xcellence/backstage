"use client";

import { toggleStandardNote } from "@/actions/standard-notes";

interface EventStandardNotesProps {
  eventId: string;
  allNotes: Array<{
    id: string;
    label: string;
    content: string;
  }>;
  selectedNoteIds: string[];
  isPartner: boolean;
}

export function EventStandardNotes({
  eventId,
  allNotes,
  selectedNoteIds,
  isPartner,
}: EventStandardNotesProps) {
  async function handleToggle(noteId: string) {
    await toggleStandardNote(eventId, noteId);
  }

  // Partner: show only selected notes as read-only
  if (isPartner) {
    const selected = allNotes.filter((n) => selectedNoteIds.includes(n.id));

    if (selected.length === 0) return null;

    return (
      <section>
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
          Standard Notes
        </h2>
        <div className="space-y-4">
          {selected.map((note) => (
            <div key={note.id}>
              <p className="font-[family-name:var(--font-raleway)] text-sm text-charcoal font-semibold mb-1">
                {note.label}
              </p>
              <p className="font-[family-name:var(--font-raleway)] text-sm text-gold-ink leading-relaxed whitespace-pre-wrap">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Owner/super_admin: show all notes with toggle checkboxes
  if (allNotes.length === 0) return null;

  return (
    <section>
      <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
        Standard Notes
      </h2>
      <div className="space-y-1">
        {allNotes.map((note) => {
          const isSelected = selectedNoteIds.includes(note.id);
          return (
            <button
              key={note.id}
              onClick={() => handleToggle(note.id)}
              className="flex items-start gap-3 w-full text-left py-3 border-b border-outline/10 cursor-pointer group"
            >
              {/* Checkbox */}
              <span
                className={`w-5 h-5 border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200 ${
                  isSelected
                    ? "bg-botanical border-botanical"
                    : "border-outline/30 group-hover:border-gold"
                }`}
              >
                {isSelected && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="text-cream"
                  >
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="square"
                    />
                  </svg>
                )}
              </span>

              <div className="flex-1 min-w-0">
                <p className="font-[family-name:var(--font-raleway)] text-sm text-charcoal font-semibold">
                  {note.label}
                </p>
                <p className="font-[family-name:var(--font-raleway)] text-sm text-grey truncate">
                  {note.content}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
