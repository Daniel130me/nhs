import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client | null {
  const bucket = env.R2_BUCKET;
  const endpoint = env.R2_ENDPOINT;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;

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
