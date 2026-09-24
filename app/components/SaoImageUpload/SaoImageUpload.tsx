"use client";

import { useState, useRef } from "react";
import { UploadCloud, Check, AlertTriangle, Loader2 } from "lucide-react";
import SaoButton from "../SaoButton/SaoButton";

interface SaoImageUploadProps {
  onUploadSuccess: (url: string) => void;
  label?: string;
}

export default function SaoImageUpload({ onUploadSuccess, label = "Tải ảnh lên" }: SaoImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (e.g. 5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.");
      return;
    }

    setIsUploading(true);
    setStatus("idle");

    try {
      // 1. Get Presigned URL from our Next.js API
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (!res.ok) throw new Error("Không thể tạo URL tải lên");
      const { presignedUrl, publicUrl } = await res.json();

      // 2. Upload file directly to S3
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) throw new Error("Upload lên S3 thất bại");

      setStatus("success");
      onUploadSuccess(publicUrl);

      // Reset after 3 seconds
      setTimeout(() => setStatus("idle"), 3000);
      
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: "none" }}
        ref={fileInputRef}
      />
      
      <SaoButton
        type="button"
        variant="default"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        style={{
          background: status === 'error' ? 'rgba(255, 68, 68, 0.2)' : status === 'success' ? 'rgba(0, 255, 170, 0.2)' : undefined,
          borderColor: status === 'error' ? '#ff4444' : status === 'success' ? '#00ffaa' : undefined,
          color: status === 'error' ? '#ff4444' : status === 'success' ? '#00ffaa' : undefined,
        }}
      >
        {isUploading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : status === 'success' ? (
          <Check size={20} />
        ) : status === 'error' ? (
          <AlertTriangle size={20} />
        ) : (
          <UploadCloud size={20} />
        )}
        
        {isUploading ? "Đang xử lý..." : status === 'success' ? "Thành công!" : status === 'error' ? "Thất bại" : label}
      </SaoButton>
    </div>
  );
}
