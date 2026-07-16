import { describe, it, expect } from "vitest";
import { formatFileSize } from "./file-size-format";

describe("formatFileSize", () => {
  it("renders sub-megabyte sizes in KB", () => {
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(500 * 1024)).toBe("500 KB");
  });

  it("never rounds a real file down to 0 KB", () => {
    expect(formatFileSize(1)).toBe("1 KB");
    expect(formatFileSize(400)).toBe("1 KB");
  });

  it("switches to MB at exactly 1MB", () => {
    expect(formatFileSize(1024 * 1024 - 1)).toBe("1024 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });

  it("renders megabyte sizes to one decimal place", () => {
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
    expect(formatFileSize(16 * 1024 * 1024)).toBe("16.0 MB");
  });

  it("degrades safely on non-positive or non-finite input", () => {
    expect(formatFileSize(0)).toBe("0 KB");
    expect(formatFileSize(-1)).toBe("0 KB");
    expect(formatFileSize(NaN)).toBe("0 KB");
  });
});
