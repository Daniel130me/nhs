import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle, AlertCircle, Loader2, File, Trash2 } from "lucide-react";

interface FileUploaderProps {
  onUploadSuccess: (url: string) => void;
  currentUrl?: string;
}

export default function FileUploader({ onUploadSuccess, currentUrl }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>(currentUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    // 10MB Limit
    if (file.size > 15 * 1024 * 1024) {
      setError("File exceeds the maximum size limit of 15MB");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        // Strip base64 metadata prefix (e.g., "data:image/png;base64,")
        const base64Data = result.split(",")[1];

        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileData: base64Data,
          }),
        });

        if (!response.ok) {
          throw new Error(`Upload server error: ${response.status}`);
        }

        const data = await response.json();
        setUploadedUrl(data.url);
        onUploadSuccess(data.url);
        setSuccess(true);
      } catch (err: any) {
        console.error("Upload failure:", err);
        setError(err.message || "Failed to upload file to storage bucket.");
      } finally {
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      setError("Failed to read local file.");
      setIsUploading(false);
    };
  };

  const triggerSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setUploadedUrl("");
    onUploadSuccess("");
    setSuccess(false);
    setError(null);
  };

  return (
    <div className="space-y-2 mt-1">
      <label className="block text-[10px] font-bold text-slate-500 uppercase">
        Study Resource File Attachment (Cloudflare R2 Storage)
      </label>

      {uploadedUrl ? (
        <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div className="flex items-center gap-2 truncate flex-1 mr-4">
            <File className="w-4 h-4 text-indigo-600 shrink-0" />
            <a 
              href={uploadedUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-indigo-600 hover:underline font-semibold truncate block"
            >
              {uploadedUrl.split("/").pop()}
            </a>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors shrink-0"
            title="Delete uploaded file"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerSelectFile}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-indigo-500 bg-indigo-50/50"
              : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                <p className="text-xs font-bold text-slate-700">Uploading attachment to R2...</p>
                <p className="text-[10px] text-slate-400">Processing media stream encryption</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-6 h-6 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">
                  <span className="text-indigo-600 font-bold">Click to upload</span> or drag & drop
                </p>
                <p className="text-[9px] text-slate-400">PDF, PPTX, Slides, or MP4 videos up to 15MB</p>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-red-500 text-[10px] font-semibold">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}

      {success && !error && (
        <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>File successfully synchronized with Cloudflare R2 bucket storage!</span>
        </div>
      )}
    </div>
  );
}
