"use client";

import React, { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  ImagePlus,
  X,
  SwitchCamera,
  RefreshCw,
  Loader2,
  ChevronDown,
  Check,
  AlertTriangle,
  ClipboardPaste
} from "lucide-react";
import { compressImageFile } from "@/lib/imageClient";
import { useI18n } from "@/lib/i18n";
import styles from "./SaoMediaPickerButton.module.css";

export interface MediaPickerCustomOption {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  badge?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void | Promise<void>;
}

export interface SaoMediaPickerButtonProps {
  /** Callback with raw File when photo is captured or selected */
  onSelectFile?: (file: File) => void | Promise<void>;

  /** Automatically uploads via /api/upload and returns the public URL */
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: Error) => void;

  /** Custom trigger render function */
  trigger?: (props: {
    isOpen: boolean;
    toggle: () => void;
    disabled?: boolean;
    isUploading?: boolean;
    status?: "idle" | "success" | "error";
  }) => ReactNode;

  /** Default button text if no custom trigger is provided */
  label?: string;

  /** Default button icon */
  icon?: ReactNode;

  /** Tooltip and accessibility */
  title?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;

  /** Dropdown menu placement and alignment */
  placement?: "top" | "bottom" | "auto";
  align?: "left" | "right" | "center";

  /** Custom extra options (Option 3, 4, ...) */
  extraOptions?: MediaPickerCustomOption[];

  /** Quick toggle to include clipboard paste option */
  enableClipboardOption?: boolean;

  /** Option customization */
  hideCamera?: boolean;
  hideGallery?: boolean;
  cameraLabel?: string;
  cameraDescription?: string;
  galleryLabel?: string;
  galleryDescription?: string;

  /** File constraints */
  accept?: string;
  maxSizeBytes?: number;
}

export default function SaoMediaPickerButton({
  onSelectFile,
  onUploadSuccess,
  onUploadError,
  trigger,
  label,
  icon,
  title,
  ariaLabel,
  className = "",
  disabled = false,
  placement = "auto",
  align = "left",
  extraOptions = [],
  enableClipboardOption = false,
  hideCamera = false,
  hideGallery = false,
  cameraLabel,
  cameraDescription,
  galleryLabel,
  galleryDescription,
  accept = "image/*",
  maxSizeBytes = 25 * 1024 * 1024 // 25MB raw limit
}: SaoMediaPickerButtonProps) {
  const { t } = useI18n();

  const effLabel = label ?? t("media.addPhoto");
  const effTitle = title ?? t("media.selectImage");
  const effAriaLabel = ariaLabel ?? t("media.uploadOptions");
  const effCameraLabel = cameraLabel ?? t("media.takePhoto");
  const effCameraDescription = cameraDescription ?? t("media.takePhotoDesc");
  const effGalleryLabel = galleryLabel ?? t("media.chooseFromLibrary");
  const effGalleryDescription = galleryDescription ?? t("media.chooseFromLibraryDesc");

  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
    align: "left" | "right" | "center";
  } | null>(null);

  // Upload status
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [uploadErrorMsg, setUploadErrorMsg] = useState("");

  // Live Camera states
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // DOM Refs
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Clean up camera stream on unmount or stream change
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Bind video element to camera stream
  useEffect(() => {
    if (isCameraModalOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraModalOpen, cameraStream]);

  // Calculate menu position when opening
  const updateMenuPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let effPlacement = placement;
    if (effPlacement === "auto") {
      effPlacement = windowHeight - rect.bottom < 240 && rect.top > 240 ? "top" : "bottom";
    }

    let top = effPlacement === "top" ? rect.top - 8 : rect.bottom + 8;
    let left = rect.left;

    if (align === "right") {
      left = rect.right;
    } else if (align === "center") {
      left = rect.left + rect.width / 2;
    }

    // Horizontal edge guard
    if (left < 10) left = 10;
    if (left > windowWidth - 250) left = Math.max(10, windowWidth - 250);

    setMenuPosition({
      top,
      left,
      placement: effPlacement,
      align
    });
  };

  const toggleMenu = () => {
    if (disabled || isUploading) return;
    if (!isMenuOpen) {
      updateMenuPosition();
      setIsMenuOpen(true);
    } else {
      setIsMenuOpen(false);
    }
  };

  // Close menu on click outside or escape
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setIsMenuOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };

    const handleScrollOrResize = () => {
      updateMenuPosition();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isMenuOpen]);

  // Handle incoming selected file
  const processFile = async (file: File) => {
    if (!file) return;

    if (maxSizeBytes && file.size > maxSizeBytes) {
      const limitMb = Math.round(maxSizeBytes / (1024 * 1024));
      const msg = t("media.imageTooLarge").replace("{max}", limitMb.toString());
      setUploadErrorMsg(msg);
      setUploadStatus("error");
      onUploadError?.(new Error(msg));
      return;
    }

    try {
      if (onSelectFile) {
        await onSelectFile(file);
      }

      if (onUploadSuccess) {
        setIsUploading(true);
        setUploadStatus("idle");
        setUploadErrorMsg("");

        const prepared = await compressImageFile(file);
        let uploadedUrl = "";

        try {
          // 1. Direct Presigned URL S3 Upload
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: prepared.filename,
              contentType: prepared.contentType
            })
          });

          if (!res.ok) throw new Error(t("media.cannotCreateUrl"));
          const { presignedUrl, publicUrl, contentType } = await res.json();

          const uploadRes = await fetch(presignedUrl, {
            method: "PUT",
            body: prepared.blob,
            headers: {
              "Content-Type": contentType || prepared.contentType
            }
          });

          if (!uploadRes.ok) throw new Error(t("media.uploadFailed"));
          uploadedUrl = publicUrl;
        } catch (s3Err) {
          // 2. Server-side base64 fallback
          console.warn("Direct upload fallback to server:", s3Err);
          const fallbackRes = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: prepared.filename,
              contentType: prepared.contentType,
              base64Data: prepared.base64
            })
          });

          if (!fallbackRes.ok) throw new Error(t("media.uploadFailed"));
          const fallbackData = await fallbackRes.json();
          uploadedUrl = fallbackData.publicUrl;
        }

        setUploadStatus("success");
        onUploadSuccess(uploadedUrl);
        setTimeout(() => setUploadStatus("idle"), 3000);
      }
    } catch (err: any) {
      console.error("Image processing error:", err);
      setUploadStatus("error");
      const msg = err?.message || t("media.uploadFailed");
      setUploadErrorMsg(msg);
      onUploadError?.(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Camera handling
  const startCameraStream = async (mode: "environment" | "user") => {
    setCameraError(null);
    setIsCameraLoading(true);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setCameraStream(stream);
      setFacingMode(mode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error("Camera stream error:", err);
      setCameraError(err.message || t("media.cameraAccessDenied"));
    } finally {
      setIsCameraLoading(false);
    }
  };

  const closeCameraModal = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraModalOpen(false);
    setCameraError(null);
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    startCameraStream(nextMode);
  };

  const snapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `captured_photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        await processFile(file);
      }
      closeCameraModal();
    }, "image/jpeg", 0.92);
  };

  const handleCameraOptionClick = () => {
    setIsMenuOpen(false);
    const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && cameraInputRef.current) {
      cameraInputRef.current.click();
      return;
    }

    if (typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
      setIsCameraModalOpen(true);
      startCameraStream("environment");
    } else if (cameraInputRef.current) {
      cameraInputRef.current.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleGalleryOptionClick = () => {
    setIsMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleClipboardOptionClick = async () => {
    setIsMenuOpen(false);
    if (typeof navigator === "undefined" || !navigator.clipboard?.read) {
      setUploadErrorMsg(t("media.clipboardNotSupported"));
      setUploadStatus("error");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `clipboard_image_${Date.now()}.${imageType.split("/")[1] || "png"}`, {
            type: imageType
          });
          await processFile(file);
          return;
        }
      }
      setUploadErrorMsg(t("media.noImageInClipboard"));
      setUploadStatus("error");
    } catch (err: any) {
      console.error("Clipboard read error:", err);
      setUploadErrorMsg(t("media.clipboardAccessDenied"));
      setUploadStatus("error");
    }
  };

  // Compile final options
  const allCustomOptions: MediaPickerCustomOption[] = [];

  if (enableClipboardOption) {
    allCustomOptions.push({
      id: "clipboard",
      label: t("media.pasteFromClipboard"),
      description: t("media.pasteFromClipboardDesc"),
      icon: <ClipboardPaste size={17} />,
      onClick: handleClipboardOptionClick
    });
  }

  allCustomOptions.push(...extraOptions);

  return (
    <div className={`${styles.container} ${className}`} ref={triggerRef}>
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        style={{ display: "none" }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={accept}
        capture="environment"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
      />

      {/* Trigger Button */}
      {trigger ? (
        trigger({
          isOpen: isMenuOpen,
          toggle: toggleMenu,
          disabled,
          isUploading,
          status: uploadStatus
        })
      ) : (
        <button
          type="button"
          className={`${styles.defaultTrigger} ${isMenuOpen ? styles.triggerActive : ""}`}
          onClick={toggleMenu}
          disabled={disabled || isUploading}
          title={effTitle}
          aria-label={effAriaLabel}
        >
          {isUploading ? (
            <Loader2 size={16} className={styles.spin} />
          ) : uploadStatus === "success" ? (
            <Check size={16} color="#00ffaa" />
          ) : uploadStatus === "error" ? (
            <AlertTriangle size={16} color="#ff4444" />
          ) : (
            icon || <Camera size={16} />
          )}
          <span>{isUploading ? t("media.uploading") : effLabel}</span>
          <ChevronDown size={14} className={`${styles.chevron} ${isMenuOpen ? styles.chevronOpen : ""}`} />
        </button>
      )}

      {/* POPUP MENU VIA PORTAL */}
      {mounted && isMenuOpen && menuPosition && createPortal(
        <div
          ref={menuRef}
          className={styles.menuDropdown}
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            transform:
              menuPosition.placement === "top"
                ? `translateY(-100%) ${menuPosition.align === "right" ? "translateX(-100%)" : menuPosition.align === "center" ? "translateX(-50%)" : ""}`
                : menuPosition.align === "right"
                ? "translateX(-100%)"
                : menuPosition.align === "center"
                ? "translateX(-50%)"
                : "none"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.menuHeader}>{t("media.uploadOptions")}</div>

          {/* Option 1: Camera */}
          {!hideCamera && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={handleCameraOptionClick}
            >
              <div className={styles.menuItemIcon}>
                <Camera size={18} />
              </div>
              <div className={styles.menuItemContent}>
                <div className={styles.menuItemLabel}>
                  {effCameraLabel}
                </div>
                {effCameraDescription && (
                  <div className={styles.menuItemDesc}>{effCameraDescription}</div>
                )}
              </div>
            </button>
          )}

          {/* Option 2: Gallery */}
          {!hideGallery && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={handleGalleryOptionClick}
            >
              <div className={styles.menuItemIcon}>
                <ImagePlus size={18} />
              </div>
              <div className={styles.menuItemContent}>
                <div className={styles.menuItemLabel}>
                  {effGalleryLabel}
                </div>
                {effGalleryDescription && (
                  <div className={styles.menuItemDesc}>{effGalleryDescription}</div>
                )}
              </div>
            </button>
          )}

          {/* Option 3, 4, ... (Custom extra options) */}
          {allCustomOptions.length > 0 && (!hideCamera || !hideGallery) && (
            <div className={styles.menuDivider} />
          )}

          {allCustomOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={opt.disabled}
              className={`${styles.menuItem} ${opt.danger ? styles.menuItemDanger : ""}`}
              onClick={async () => {
                setIsMenuOpen(false);
                await opt.onClick();
              }}
            >
              {opt.icon && (
                <div className={styles.menuItemIcon}>{opt.icon}</div>
              )}
              <div className={styles.menuItemContent}>
                <div className={styles.menuItemLabel}>
                  <span>{opt.label}</span>
                  {opt.badge && <span className={styles.menuBadge}>{opt.badge}</span>}
                </div>
                {opt.description && (
                  <div className={styles.menuItemDesc}>{opt.description}</div>
                )}
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* WEBRTC LIVE CAMERA VIEWFINDER MODAL VIA PORTAL */}
      {mounted && isCameraModalOpen && createPortal(
        <div className={styles.cameraModalOverlay} onClick={closeCameraModal}>
          <div className={styles.cameraModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.cameraModalHeader}>
              <div className={styles.cameraModalTitle}>
                <Camera size={18} color="#00f0ff" />
                <span>{t("media.cameraTitle")}</span>
              </div>
              <button
                type="button"
                className={styles.closeCameraBtn}
                onClick={closeCameraModal}
                title={t("media.closeCamera")}
                aria-label={t("media.closeCamera")}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.cameraViewfinder}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`${styles.cameraVideo} ${facingMode === "user" ? styles.mirrorVideo : ""}`}
              />

              {/* SAO HUD Reticle */}
              <div className={styles.hudReticle}>
                <div className={styles.reticleCornerTL} />
                <div className={styles.reticleCornerTR} />
                <div className={styles.reticleCornerBL} />
                <div className={styles.reticleCornerBR} />
                <div className={styles.reticleCross} />
              </div>

              {/* Loading State */}
              {isCameraLoading && (
                <div className={styles.cameraLoadingState}>
                  <RefreshCw size={24} className={styles.spin} />
                  <span>{t("media.connectingCamera")}</span>
                </div>
              )}

              {/* Error State */}
              {cameraError && !isCameraLoading && (
                <div className={styles.cameraErrorState}>
                  <div className={styles.cameraErrorText}>{cameraError}</div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button
                      type="button"
                      className={styles.cameraRetryBtn}
                      onClick={() => startCameraStream(facingMode)}
                    >
                      <RefreshCw size={14} /> {t("media.retry")}
                    </button>
                    <button
                      type="button"
                      className={styles.cameraFileBtn}
                      onClick={() => {
                        closeCameraModal();
                        cameraInputRef.current?.click();
                      }}
                    >
                      <Camera size={14} /> {t("media.useSystemCamera")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.cameraControls}>
              <button
                type="button"
                className={styles.camToolBtn}
                onClick={toggleCameraFacing}
                disabled={isCameraLoading || !!cameraError}
                title={t("media.switchCamera")}
                aria-label={t("media.switchCamera")}
              >
                <SwitchCamera size={20} />
              </button>

              <button
                type="button"
                className={styles.camShutterBtn}
                onClick={snapPhoto}
                disabled={isCameraLoading || !!cameraError}
                title={t("media.snapPhoto")}
                aria-label={t("media.snapPhoto")}
              >
                <div className={styles.shutterInner} />
              </button>

              <button
                type="button"
                className={styles.camToolBtn}
                onClick={() => {
                  closeCameraModal();
                  fileInputRef.current?.click();
                }}
                title={t("media.selectFromFile")}
                aria-label={t("media.selectFromFile")}
              >
                <ImagePlus size={19} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
