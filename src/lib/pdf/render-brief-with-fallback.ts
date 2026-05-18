interface RenderBriefOptions {
  /**
   * Maximum ms to wait for the main render before treating it as failed
   * and running the text-only fallback. Default: 25000ms (leaves 5s margin
   * within Vercel's 30s function timeout). Pass a lower value in tests.
   */
  timeoutMs?: number;
}

/**
 * Attempts to render the full PDF brief. If the renderer throws or exceeds
 * `timeoutMs` (e.g. OOM / hang in a Vercel serverless function), renders the
 * text-only fallback instead.
 *
 * Both render functions are passed in so this helper has no dependency on
 * the React PDF renderer itself — it stays pure and unit-testable.
 */
export async function renderBriefWithFallback(
  mainRender: () => Promise<Buffer>,
  fallbackRender: () => Promise<Buffer>,
  { timeoutMs = 25_000 }: RenderBriefOptions = {}
): Promise<{ buffer: Buffer; usedFallback: boolean }> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`PDF render timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    const buffer = await Promise.race([mainRender(), timeoutPromise]);
    clearTimeout(timeoutHandle);
    return { buffer, usedFallback: false };
  } catch (mainErr) {
    clearTimeout(timeoutHandle);
    console.warn("PDF: full brief render failed, attempting text-only fallback", mainErr);
    const buffer = await fallbackRender();
    return { buffer, usedFallback: true };
  }
}
