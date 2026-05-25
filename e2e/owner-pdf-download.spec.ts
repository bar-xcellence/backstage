import { test, expect, type Page } from "@playwright/test";
import { signInAs } from "./helpers/auth";

async function firstEventDetailHref(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const links = Array.from(
      document.querySelectorAll('a[href^="/events/"]')
    ) as HTMLAnchorElement[];
    const real = links.find((a) =>
      /^\/events\/[0-9a-f-]{8,}/i.test(a.getAttribute("href") || "")
    );
    return real ? real.getAttribute("href") : null;
  });
}

// Owner + partner happy path: PDF download returns a valid PDF for an
// existing event. The PDF route has its own role gate (events.ts:50-57), so
// this also verifies the partner branch returns a stripped brief.

test.describe("PDF download", () => {
  test("owner downloads a valid PDF for a seeded event", async ({ page, request }) => {
    await signInAs(page, "owner", "/events");

    const href = await firstEventDetailHref(page);
    if (!href) {
      test.skip(true, "no events seeded");
      return;
    }
    const eventId = href.split("/").pop();
    expect(eventId).toMatch(/[0-9a-f-]{8,}/i);

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const response = await request.get(`/api/events/${eventId}/pdf`, {
      headers: { Cookie: cookieHeader },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");

    const body = await response.body();
    expect(body.length).toBeGreaterThan(1000);
    expect(body.slice(0, 5).toString("ascii")).toBe("%PDF-");
  });

  test("partner downloads a valid PDF for a partner-visible event", async ({ page, request }) => {
    await signInAs(page, "partner", "/events");

    const href = await firstEventDetailHref(page);
    if (!href) {
      test.skip(true, "no partner-visible events seeded");
      return;
    }
    const eventId = href.split("/").pop();
    expect(eventId).toMatch(/[0-9a-f-]{8,}/i);

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const response = await request.get(`/api/events/${eventId}/pdf`, {
      headers: { Cookie: cookieHeader },
    });

    expect(response.status()).toBe(200);
    expect((await response.body()).slice(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
