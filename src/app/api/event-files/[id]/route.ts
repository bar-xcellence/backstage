import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventFiles } from "@/db/schema";
import { getSession } from "@/lib/session";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Build an RFC 6266 Content-Disposition. The filename is user-supplied at
// upload (browser `file.name`), so it can hold anything the OS allows.
// Node's Headers rejects CR/LF (no header injection possible here) but also
// throws on any char > U+00FF — so a plain "Aurora – floor plan.pdf" would
// 500 the route. Emit an ASCII-only `filename=` fallback plus a
// percent-encoded `filename*=UTF-8''…` that carries the real name.
function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const fallback = ascii.trim() || "download";
  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

// Private blobs have no fetchable URL — this route is the only read path.
// Auth is checked here, right next to get(), per Vercel's guidance (never
// rely on middleware alone for private blob delivery).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "owner" && session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // A stale or mistyped link would otherwise reach Postgres as a bad uuid cast
  // and surface as a 500 rather than a 404.
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const [file] = await db
    .select()
    .from(eventFiles)
    .where(eq(eventFiles.id, id))
    .limit(1);

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const result = await get(file.blobUrl, { access: "private" });

    // GetBlobResult is a discriminated union on statusCode (200 | 304); this
    // narrows to the 200 branch, where stream and blob.contentType are non-null.
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        // Trusted: the upload token pins allowedContentTypes to pdf/jpeg/png,
        // and nosniff makes the declared type authoritative — so nothing
        // served here can render as HTML/SVG in this origin.
        "Content-Type": result.blob.contentType,
        "Content-Disposition": contentDisposition(file.fileName),
        "X-Content-Type-Options": "nosniff",
        // Never let a shared CDN cache a private, per-user response.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error(`Blob fetch failed for event file ${id}:`, err);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
