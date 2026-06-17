import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getSession } from "@/lib/session";

const f = createUploadthing();

export const uploadRouter = {
  recipeImage: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await getSession();

      if (
        !session ||
        (session.role !== "owner" && session.role !== "super_admin")
      ) {
        throw new Error("Unauthorized");
      }

      return { userId: session.userId };
    })
    .onUploadComplete(async ({ file }) => {
      return {
        referenceImageUrl: file.ufsUrl,
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
