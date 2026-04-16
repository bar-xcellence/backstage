import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const LOG = path.join(process.cwd(), ".cursor", "debug-08f604.log");

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  try {
    const body = await req.json();
    await mkdir(path.dirname(LOG), { recursive: true });
    await appendFile(LOG, `${JSON.stringify(body)}\n`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
