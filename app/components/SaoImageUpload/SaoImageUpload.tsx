"use client";

import { useState, useRef } from "react";
import { UploadCloud, Check, AlertTriangle, Loader2, Camera, Image as ImageIcon } from "lucide-react";
import { compressImageFile } from "@/lib/imageClient";
import SaoButton from "../SaoButton/SaoButton";

interface SaoImageUploadProps {
  onUploadSuccess: (url: string) => void;
  label?: string;
}

export default function SaoImageUpload({ onUploadSuccess, label = "Tải ảnh lên" }: SaoImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    // Allow up to 25MB raw photo from phone camera before client-side compression
    if (file.size > 25 * 1024 * 1024) {
      setStatus("error");
      setErrorMessage("Ảnh quá lớn (tối đa 25MB)");
      return;
    }

    setIsUploading(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const prepared = await compressImageFile(file);
      let uploadedUrl = "";

      try {
        // 1. Try Presigned URL upload first
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: prepared.filename,
            contentType: prepared.contentType,
          }),
        });

        if (!res.ok) throw new Error("Không thể tạo URL tải lên");
        const { presignedUrl, publicUrl, contentType } = await res.json();

        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          body: prepared.blob,
          headers: {
            'Content-Type': contentType || prepared.contentType,
          },
        });

        if (!uploadRes.ok) throw new Error("Upload trực tiếp S3 thất bại");
        uploadedUrl = publicUrl;
      } catch (directUploadErr) {
        // 2. Fallback to server-side upload via /api/upload
        console.warn("Direct S3 upload failed, falling back to server upload:", directUploadErr);
        const fallbackRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: prepared.filename,
            contentType: prepared.contentType,
            base64Data: prepared.base64,
          }),
        });

        if (!fallbackRes.ok) throw new Error("Tải ảnh lên thất bại");
        const fallbackData = await fallbackRes.json();
        uploadedUrl = fallbackData.publicUrl;
      }

      setStatus("success");
      onUploadSuccess(uploadedUrl);

      // Reset status after 3 seconds
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err?.message || "Lỗi tải ảnh, vui lòng thử lại");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
        ref={fileInputRef}
      />
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: "none" }}
        ref={cameraInputRef}
      />
      
      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
        <SaoButton
          type="button"
          variant="default"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            cameraInputRef.current?.click();
          }}
          disabled={isUploading}
          style={{
            flex: 1,
            padding: '8px 10px',
            background: status === 'error' ? 'rgba(255, 68, 68, 0.2)' : status === 'success' ? 'rgba(0, 255, 170, 0.2)' : undefined,
            borderColor: status === 'error' ? '#ff4444' : status === 'success' ? '#00ffaa' : undefined,
            color: status === 'error' ? '#ff4444' : status === 'success' ? '#00ffaa' : undefined,
          }}
        >
          {isUploading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : status === 'success' ? (
            <Check size={18} />
          ) : status === 'error' ? (
            <AlertTriangle size={18} />
          ) : (
            <Camera size={18} />
          )}
          <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
            {isUploading ? 'Đang tải...' : status === 'success' ? 'Đã tải ảnh' : 'Chụp ảnh'}
          </span>
        </SaoButton>

        <SaoButton
          type="button"
          variant="default"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          disabled={isUploading}
          style={{
            flex: 1,
            padding: '8px 10px',
            background: status === 'error' ? 'rgba(255, 68, 68, 0.2)' : status === 'success' ? 'rgba(0, 255, 170, 0.2)' : undefined,
            borderColor: status === 'error' ? '#ff4444' : status === 'success' ? '#00ffaa' : undefined,
            color: status === 'error' ? '#ff4444' : status === 'success' ? '#00ffaa' : undefined,
          }}
        >
          {isUploading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : status === 'success' ? (
            <Check size={18} />
          ) : status === 'error' ? (
            <AlertTriangle size={18} />
          ) : (
            <ImageIcon size={18} />
          )}
          <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
            {isUploading ? 'Đang tải...' : status === 'success' ? 'Đã chọn' : 'Thư viện'}
          </span>
        </SaoButton>
      </div>
      {status === 'error' && errorMessage && (
        <span style={{ fontSize: '12px', color: '#ff6b6b' }}>{errorMessage}</span>
      )}
    </div>
  );
}
