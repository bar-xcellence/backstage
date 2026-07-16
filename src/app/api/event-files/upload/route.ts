import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { MAX_EVENT_FILE_BYTES } from "@/lib/event-file-validation";

// Token exchange for direct browser→Blob uploads (bypasses the 4.5MB
// serverless body limit). The store is PRIVATE, so uploaded blobs are never
// publicly reachable; downloads go through /api/event-files/[id].
//
// No `onUploadCompleted` here on purpose: DB rows are inserted by the client
// calling addEventFile() once upload() resolves. Registering the callback —
// even as a no-op — would make the SDK embed a callbackUrl in the token and
// have Blob POST back on every upload, which can't reach localhost in dev.
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getSession();
        if (
          !session ||
          (session.role !== "owner" && session.role !== "super_admin")
        ) {
          throw new Error("Unauthorized");
        }

        return {
          allowedContentTypes: ["application/pdf", "image/jpeg", "image/png"],
          maximumSizeInBytes: MAX_EVENT_FILE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.userId }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
