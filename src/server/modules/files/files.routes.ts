import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { uploadFileService } from "../../services/r2.service";
import { BadRequestError } from "../../utils/errors";
import { requireActiveUser } from "../../middleware/auth";
import { logAudit } from "../../utils/audit";

const router = Router();

router.post("/upload", requireActiveUser, asyncHandler(async (req, res) => {
  const { fileName, mimeType, fileData } = req.body;
  if (!fileName || !mimeType || !fileData) {
    throw new BadRequestError("fileName, mimeType, and fileData are required");
  }

  // Decode base64 payload
  const buffer = Buffer.from(fileData, "base64");
  const uploadedUrl = await uploadFileService(fileName, mimeType, buffer);

  return sendSuccess(res, { url: uploadedUrl }, "File uploaded successfully");
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
