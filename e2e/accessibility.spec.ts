import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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

// axe audit: assert no critical or serious violations on the key authenticated
// surfaces. Per CLAUDE.md threat model + design system rules.
//
// `color-contrast` remains disabled — but the GOLD half of the problem is now
// fixed: all gold text/button fills were migrated to `gold-ink` (#7A5416) on
// light surfaces (dashboards pass with the rule on). See
// docs/superpowers/specs/2026-05-30-gold-contrast-aa-fix-design.md.
//
// Re-enabling the rule fully then surfaced PRE-EXISTING non-gold palette debt
// the rule had been masking: the semantic status pills (`bg-{cognac|success|
// botanical|error}/NN text-{same}`, 2.5–3.1:1), some 10px semantic meta labels,
// and a few faded greys on charcoal. Those need brand-token decisions and are
// tracked in docs/superpowers/specs/2026-05-30-palette-contrast-followup-design.md.
// Re-enable this rule (set DISABLED_RULES = []) once that follow-up lands.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const DISABLED_RULES = ["color-contrast"];

function severeOnly(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]
) {
  return violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
}

function builder(page: Page) {
  return new AxeBuilder({ page }).withTags(TAGS).disableRules(DISABLED_RULES);
}

test.describe("a11y — axe scan, critical+serious only", () => {
  test("signin page is clean", async ({ page }) => {
    await page.goto("/auth/signin");
    const results = await builder(page).analyze();
    expect(severeOnly(results.violations)).toEqual([]);
  });

  test("owner dashboard at / is clean", async ({ page }) => {
    await signInAs(page, "owner", "/");
    await page.waitForLoadState("networkidle");
    const results = await builder(page).analyze();
    expect(severeOnly(results.violations)).toEqual([]);
  });

  test("partner dashboard at / is clean", async ({ page }) => {
    await signInAs(page, "partner", "/");
    await page.waitForLoadState("networkidle");
    const results = await builder(page).analyze();
    expect(severeOnly(results.violations)).toEqual([]);
  });

  test("events list (/events) is clean for owner", async ({ page }) => {
    await signInAs(page, "owner", "/events");
    await page.waitForLoadState("networkidle");
    const results = await builder(page).analyze();
    expect(severeOnly(results.violations)).toEqual([]);
  });

  test("event detail is clean for owner", async ({ page }) => {
    await signInAs(page, "owner", "/events");
    const href = await firstEventDetailHref(page);
    if (!href) {
      test.skip(true, "no events seeded — nothing to inspect");
      return;
    }
    await page.goto(href);
    await page.waitForLoadState("networkidle");
    const results = await builder(page).analyze();
    expect(severeOnly(results.violations)).toEqual([]);
  });

  test("event detail is clean for partner", async ({ page }) => {
    await signInAs(page, "partner", "/events");
    const href = await firstEventDetailHref(page);
    if (!href) {
      test.skip(true, "no partner-visible events seeded");
      return;
    }
    await page.goto(href);
    await page.waitForLoadState("networkidle");
    const results = await builder(page).analyze();
    expect(severeOnly(results.violations)).toEqual([]);
  });

  test("settings is clean for owner", async ({ page }) => {
    await signInAs(page, "owner", "/settings");
    await page.waitForLoadState("networkidle");
    const results = await builder(page).analyze();
    expect(severeOnly(results.violations)).toEqual([]);
  });
});
