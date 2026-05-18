import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnvLocal(): void {
  if (process.env.DATABASE_URL) return;
  let file: string;
  try {
    file = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  } catch {
    return;
  }
  for (const line of file.split("\n")) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

export default async function globalTeardown(): Promise<void> {
  loadDotEnvLocal();
  if (!process.env.DATABASE_URL) {
    console.warn("E2E teardown: DATABASE_URL not set; skipping cleanup");
    return;
  }

  const sql = neon(process.env.DATABASE_URL);
  const rows = (await sql`
    DELETE FROM events
    WHERE starts_with(event_name, ${"E2E_"})
    RETURNING id
  `) as { id: string }[];

  console.log(`E2E teardown: cleared ${rows.length} test event(s) from the database`);
}
