import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(neon(url), { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

/** Lazy init so importing this module during `next build` does not call `neon()` without env (e.g. Vercel). */
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop, receiver) {
    if (!_db) {
      _db = createDb();
    }
    const value = Reflect.get(_db as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(_db);
    }
    return value;
  },
});
