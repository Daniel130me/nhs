import { PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { getS3Client } from "../config/r2";
import { env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Uploads a file buffer to Cloudflare R2 if credentials exist.
 * Otherwise, falls back to writing the file locally in /public/uploads/
 */
export async function uploadFileService(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const client = getS3Client();
  const bucket = env.R2_BUCKET;

  const uniqueName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  if (client && bucket) {
    try {
      logger.info(`[R2] Uploading ${uniqueName} to R2 bucket ${bucket}...`);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: uniqueName,
          Body: buffer,
          ContentType: mimeType,
          ACL: "public-read", // standard for public links
        })
      );
      
      const endpointUrl = env.R2_ENDPOINT || "";
      const cleanedEndpoint = endpointUrl.replace(/https?:\/\//, "");
      return `https://${bucket}.${cleanedEndpoint}/${uniqueName}`;
    } catch (error: any) {
      logger.error("[R2] Upload failed, falling back to local file storage:", error);
    }
  }

  // Fallback to local disk storage
  logger.info(`[Local Storage] Saving ${uniqueName} locally...`);
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, uniqueName);
  await fs.promises.writeFile(filePath, buffer);

  // Return local relative path served by Express static server
  return `/uploads/${uniqueName}`;
}
