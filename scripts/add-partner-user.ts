/**
 * One-off, idempotent insert of Murdo's read-only partner account.
 *
 * Run against the SAME database the live site reads from:
 *   tsx --env-file=.env.local scripts/add-partner-user.ts
 * (or point DATABASE_URL at production first).
 *
 * Safe to re-run — onConflictDoNothing means a second run is a no-op.
 * The matching allow-list entry lives in src/lib/auth-config.ts and must be
 * deployed for the live site to accept this login.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema";

async function main() {
  const email = "murdo@hacien.com";
  const inserted = await db
    .insert(users)
    .values({ email, name: "Murdo (LC view)", role: "partner" as const })
    .onConflictDoNothing()
    .returning({ id: users.id, email: users.email, role: users.role });

  if (inserted.length) {
    console.log("✓ Created partner user:", inserted[0]);
  } else {
    const [existing] = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, email));
    console.log("• Already exists, no change:", existing);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to add partner user:", err);
    process.exit(1);
  });
