import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { events } from "@/db/schema";
import {
  PARTNER_VISIBLE_DB_FIELDS,
  PARTNER_VISIBLE_COMPUTED_FIELDS,
  OWNER_ONLY_FIELDS,
  PARTNER_STRIPPED_FIELDS,
} from "./partner-event-projection";

const allEventColumns = new Set(Object.keys(getTableColumns(events)));

describe("partner-event-projection allow-list", () => {
  it("every PARTNER_VISIBLE_DB_FIELDS key exists on the events schema", () => {
    for (const key of PARTNER_VISIBLE_DB_FIELDS) {
      expect(allEventColumns.has(key)).toBe(true);
    }
  });

  it("PARTNER_STRIPPED_FIELDS does not overlap with PARTNER_VISIBLE_DB_FIELDS", () => {
    for (const key of PARTNER_STRIPPED_FIELDS) {
      expect(PARTNER_VISIBLE_DB_FIELDS).not.toContain(key);
    }
  });

  it("PARTNER_STRIPPED_FIELDS does not overlap with PARTNER_VISIBLE_COMPUTED_FIELDS", () => {
    for (const key of PARTNER_STRIPPED_FIELDS) {
      expect(PARTNER_VISIBLE_COMPUTED_FIELDS).not.toContain(key as never);
    }
  });

  it("every column on events is classified into exactly one bucket", () => {
    const buckets = new Set<string>([
      ...PARTNER_VISIBLE_DB_FIELDS,
      ...OWNER_ONLY_FIELDS,
      ...PARTNER_STRIPPED_FIELDS,
    ]);

    const unclassified: string[] = [];
    for (const col of allEventColumns) {
      if (!buckets.has(col)) unclassified.push(col);
    }

    expect(unclassified).toEqual([]);
  });

  it("no column is in more than one bucket", () => {
    const counts = new Map<string, number>();
    for (const k of PARTNER_VISIBLE_DB_FIELDS) counts.set(k, (counts.get(k) ?? 0) + 1);
    for (const k of OWNER_ONLY_FIELDS) counts.set(k, (counts.get(k) ?? 0) + 1);
    for (const k of PARTNER_STRIPPED_FIELDS) counts.set(k, (counts.get(k) ?? 0) + 1);

    const duplicates = Array.from(counts.entries()).filter(([, n]) => n > 1);
    expect(duplicates).toEqual([]);
  });
});
