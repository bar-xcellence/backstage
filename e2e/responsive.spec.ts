import { test, expect, type Page } from "@playwright/test";
import { signInAs } from "./helpers/auth";

// Responsive smoke: at three breakpoints, the dashboard must render its core
// landmarks without horizontal scroll. We don't assert exact layout (CSS
// changes too often) — we assert the user can see what they came for.

const BREAKPOINTS = [
  { name: "mobile",  width: 375,  height: 667  }, // iPhone SE
  { name: "tablet",  width: 768,  height: 1024 }, // iPad portrait
  { name: "desktop", width: 1440, height: 900  }, // laptop
] as const;

async function assertNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  // 1px allowance for sub-pixel rendering quirks
  expect(
    overflow.scrollWidth,
    `expected no horizontal overflow (scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth})`
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

// Returns the href of the first real event detail link, skipping /events/new.
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

for (const bp of BREAKPOINTS) {
  test.describe(`responsive @ ${bp.name} (${bp.width}x${bp.height})`, () => {
    test.use({ viewport: { width: bp.width, height: bp.height } });

    test("owner dashboard renders core landmarks", async ({ page }) => {
      await signInAs(page, "owner", "/");
      await expect(
        page.locator(
          "text=/^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER) \\d{4} ·/"
        )
      ).toBeVisible();
      await assertNoHorizontalScroll(page);
    });

    test("partner dashboard renders core landmarks", async ({ page }) => {
      await signInAs(page, "partner", "/");
      await expect(
        page.locator(
          "text=/^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER) \\d{4} ·/"
        )
      ).toBeVisible();
      await assertNoHorizontalScroll(page);
    });

    test("event detail renders core landmarks", async ({ page }) => {
      await signInAs(page, "owner", "/events");
      const href = await firstEventDetailHref(page);
      if (!href) {
        test.skip(true, "no events seeded");
        return;
      }
      await page.goto(href);
      await expect(page).toHaveURL(/\/events\/[0-9a-f-]{8,}/i);
      // Page is interactive — the event-name h1 (rendered in the main column,
      // not the brand h1 in the sidebar which is sometimes icon-only) is visible.
      const mainH1 = page.locator("main h1, h1:not(:has-text('Bar Excellence'))").first();
      await expect(mainH1).toBeVisible();
      await assertNoHorizontalScroll(page);
    });
  });
}

test.describe("layout chrome by breakpoint", () => {
  test("mobile (375): top bar replaces sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await signInAs(page, "owner", "/");
    const sidebar = page.locator('aside, [role="complementary"], nav').first();
    if ((await sidebar.count()) > 0) {
      const box = await sidebar.boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(96);
      }
    }
  });

  test("desktop (1440): full sidebar is present", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInAs(page, "owner", "/");
    const nav = page.getByRole("navigation").first();
    await expect(nav).toBeVisible();
  });
});
