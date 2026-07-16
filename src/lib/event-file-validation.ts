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
