import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

// Initialize S3 / R2 client lazily to avoid crashing on startup if credentials are empty
let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  const bucket = process.env.R2_BUCKET;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (bucket && endpoint && accessKeyId && secretAccessKey) {
    if (!s3Client) {
      console.log("[R2] Initializing Cloudflare R2 Client with endpoint:", endpoint);
      s3Client = new S3Client({
        region: "auto",
        endpoint: endpoint,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      });
    }
    return s3Client;
  }
  return null;
}

/**
 * Uploads a file buffer to Cloudflare R2 if credentials exist.
 * Otherwise, falls back to writing the file locally in /uploads/
 */
export async function uploadFile(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET;

  const uniqueName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  if (client && bucket) {
    try {
      console.log(`[R2] Uploading ${uniqueName} to R2 bucket ${bucket}...`);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: uniqueName,
          Body: buffer,
          ContentType: mimeType,
          ACL: "public-read", // standard for public links
        })
      );
      
      // Determine R2 public URL
      // S3 endpoints usually look like: https://<account_id>.r2.cloudflarestorage.com
      // The public URL is typically custom domain or bucket-based, but we can return
      // a constructed path, or a public bucket proxy URL. Let's return the URL.
      const endpointUrl = process.env.R2_ENDPOINT || "";
      const cleanedEndpoint = endpointUrl.replace(/https?:\/\//, "");
      return `https://${bucket}.${cleanedEndpoint}/${uniqueName}`;
    } catch (error: any) {
      console.error("[R2] Upload failed, falling back to local file storage:", error);
    }
  }

  // Fallback to local disk storage
  console.log(`[Local Storage] Saving ${uniqueName} locally...`);
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, uniqueName);
  await fs.promises.writeFile(filePath, buffer);

  // Return local relative path served by Express static server
  return `/uploads/${uniqueName}`;
}
