"use server";

import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { validateSettingValue } from "@/lib/setting-validation";
import { revalidatePath } from "next/cache";

export async function getAppSetting(key: string): Promise<string | null> {
  await requireRole("owner", "super_admin");
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return row?.value ?? null;
}

export async function setAppSetting(
  key: string,
  rawValue: string | null | undefined
): Promise<{ error?: string }> {
  const session = await requireRole("owner", "super_admin");

  const parsed = validateSettingValue(key, rawValue);
  if ("error" in parsed) return { error: parsed.error };

  if (parsed.value === null) {
    await db.delete(appSettings).where(eq(appSettings.key, key));
  } else {
    await db
      .insert(appSettings)
      .values({
        key,
        value: parsed.value,
        updatedBy: session.userId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: parsed.value,
          updatedBy: session.userId,
          updatedAt: new Date(),
        },
      });
  }

  revalidatePath("/settings");
  return {};
}
