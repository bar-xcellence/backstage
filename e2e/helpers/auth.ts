import type { Page } from "@playwright/test";

export const TEST_USERS = {
  owner: "murdo@bar-excellence.co.uk",
  superAdmin: "rob@roberthayford.com",
  partner: "rory@lc-group.com",
} as const;

export type TestRole = keyof typeof TEST_USERS;

export async function signInAs(page: Page, role: TestRole, redirect = "/") {
  const email = TEST_USERS[role];
  await page.goto(
    `/auth/test-signin?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirect)}`
  );
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/"));
}

export function uniqueEventName(prefix: string): string {
  return `E2E_${prefix}_${Date.now()}`;
}
