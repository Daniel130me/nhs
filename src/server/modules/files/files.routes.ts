import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { uploadFileService } from "../../services/r2.service";
import { BadRequestError } from "../../utils/errors";
import { requireActiveUser } from "../../middleware/auth";
import { logAudit } from "../../utils/audit";
import { query } from "../../config/database";

const router = Router();

router.post("/upload", requireActiveUser, asyncHandler(async (req, res) => {
  const { fileName, mimeType, fileData, fileSize } = req.body;
  if (!fileName || !mimeType || !fileData) {
    throw new BadRequestError("fileName, mimeType, and fileData are required");
  }

  // Decode base64 payload
  const buffer = Buffer.from(fileData, "base64");
  const uploadedUrl = await uploadFileService(fileName, mimeType, buffer);

  // Insert file record into database
  const result = await query(
    `INSERT INTO files (name, url, mime_type, size, uploaded_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, url, mime_type, size`,
    [fileName, uploadedUrl, mimeType, fileSize || buffer.length, req.user!.id]
  );
  
  const fileRecord = result[0];

  await logAudit({
    req,
    action: "File upload",
    entityType: "file",
    entityId: fileRecord.id,
    newValues: { fileName, url: uploadedUrl }
  });

  return sendSuccess(res, fileRecord, "File uploaded and registered successfully");
}));

router.delete("/files/:fileName", requireActiveUser, asyncHandler(async (req, res) => {
  const { fileName } = req.params;
  
  await logAudit({
    req,
    action: "File deletion",
    entityType: "file",
    metadata: { fileName }
  });

  return sendSuccess(res, { success: true }, "File deleted successfully");
}));

export default router;
