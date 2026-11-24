"use client";

import { useState } from "react";
import SaoMediaPickerButton, { MediaPickerCustomOption } from "../SaoMediaPickerButton/SaoMediaPickerButton";

interface SaoImageUploadProps {
  onUploadSuccess: (url: string) => void;
  label?: string;
  extraOptions?: MediaPickerCustomOption[];
  placement?: "top" | "bottom" | "auto";
  align?: "left" | "right" | "center";
  enableClipboardOption?: boolean;
}

export default function SaoImageUpload({
  onUploadSuccess,
  label,
  extraOptions,
  placement = "auto",
  align = "left",
  enableClipboardOption = false
}: SaoImageUploadProps) {
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, width: "100%" }}>
      <SaoMediaPickerButton
        onUploadSuccess={onUploadSuccess}
        onUploadError={(err) => setErrorMessage(err.message)}
        label={label}
        placement={placement}
        align={align}
        extraOptions={extraOptions}
        enableClipboardOption={enableClipboardOption}
      />
      {errorMessage && (
        <span style={{ fontSize: "12px", color: "#ff6b6b" }}>{errorMessage}</span>
      )}
    </div>
  );
}
