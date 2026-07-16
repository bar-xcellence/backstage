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
