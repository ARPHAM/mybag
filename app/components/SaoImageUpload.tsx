"use client";

import { useState } from "react";
import SaoMediaPickerButton, { MediaPickerCustomOption } from "./SaoMediaPickerButton";
import { ButtonVariant, ButtonShape } from "./SaoButton";

interface SaoImageUploadProps {
  onUploadSuccess: (url: string) => void;
  label?: string;
  extraOptions?: MediaPickerCustomOption[];
  placement?: "top" | "bottom" | "auto";
  align?: "left" | "right" | "center";
  enableClipboardOption?: boolean;
  variant?: ButtonVariant;
  shape?: ButtonShape;
}

export default function SaoImageUpload({
  onUploadSuccess,
  label,
  extraOptions,
  placement = "auto",
  align = "left",
  enableClipboardOption = false,
  variant = "primary",
  shape = "cyber"
}: SaoImageUploadProps) {
  const [errorMessage, setErrorMessage] = useState("");

  const alignItems = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems, gap: "6px", flex: 1, width: "100%" }}>
      <SaoMediaPickerButton
        onUploadSuccess={onUploadSuccess}
        onUploadError={(err) => setErrorMessage(err.message)}
        label={label}
        placement={placement}
        align={align}
        variant={variant}
        shape={shape}
        extraOptions={extraOptions}
        enableClipboardOption={enableClipboardOption}
      />
      {errorMessage && (
        <span style={{ fontSize: "12px", color: "#ff6b6b", textAlign: align }}>{errorMessage}</span>
      )}
    </div>
  );
}
