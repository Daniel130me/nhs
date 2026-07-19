import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/api-response";
import { uploadFileService } from "../../services/r2.service";
import { BadRequestError } from "../../utils/errors";

const router = Router();

router.post("/upload", asyncHandler(async (req, res) => {
  const { fileName, mimeType, fileData } = req.body;
  if (!fileName || !mimeType || !fileData) {
    throw new BadRequestError("fileName, mimeType, and fileData are required");
  }

  // Decode base64 payload
  const buffer = Buffer.from(fileData, "base64");
  const uploadedUrl = await uploadFileService(fileName, mimeType, buffer);

  return sendSuccess(res, { url: uploadedUrl }, "File uploaded successfully");
}));

export default router;
