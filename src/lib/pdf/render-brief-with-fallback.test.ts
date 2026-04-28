import { describe, it, expect, vi } from "vitest";
import { renderBriefWithFallback } from "./render-brief-with-fallback";

describe("renderBriefWithFallback", () => {
  it("returns full PDF buffer when main render succeeds", async () => {
    const main = async () => Buffer.from("full-pdf");
    const fallback = async () => Buffer.from("fallback-pdf");
    const result = await renderBriefWithFallback(main, fallback);
    expect(result.buffer.toString()).toBe("full-pdf");
    expect(result.usedFallback).toBe(false);
  });

  it("calls fallback and flags it when main render throws", async () => {
    const main = async (): Promise<Buffer> => {
      throw new Error("out of memory");
    };
    const fallback = async () => Buffer.from("text-only-pdf");
    const result = await renderBriefWithFallback(main, fallback);
    expect(result.buffer.toString()).toBe("text-only-pdf");
    expect(result.usedFallback).toBe(true);
  });

  it("propagates error when both renders fail", async () => {
    const main = async (): Promise<Buffer> => {
      throw new Error("main failed");
    };
    const fallback = async (): Promise<Buffer> => {
      throw new Error("fallback also failed");
    };
    await expect(renderBriefWithFallback(main, fallback)).rejects.toThrow(
      "fallback also failed"
    );
  });

  it("does not call fallback at all when main succeeds", async () => {
    const main = async () => Buffer.from("full-pdf");
    const fallback = vi.fn(async () => Buffer.from("fallback-pdf"));
    await renderBriefWithFallback(main, fallback);
    expect(fallback).not.toHaveBeenCalled();
  });

  it("falls back when main render exceeds the timeout", async () => {
    const main = () => new Promise<Buffer>(() => {});
    const fallback = async () => Buffer.from("text-only-pdf");
    const result = await renderBriefWithFallback(main, fallback, {
      timeoutMs: 10,
    });
    expect(result.usedFallback).toBe(true);
    expect(result.buffer.toString()).toBe("text-only-pdf");
  });
});
