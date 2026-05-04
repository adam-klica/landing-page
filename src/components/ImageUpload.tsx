"use client";

import { useState } from "react";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label = "Featured Image" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
        setPreview(data.url);
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input
    }
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const url = e.target.value;
    onChange(url);
    setPreview(url);
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px", fontWeight: "600" }}>
        {label}
      </label>
      
      {preview && (
        <div style={{ marginBottom: "10px" }}>
          <img
            src={preview}
            alt="Preview"
            style={{
              maxWidth: "300px",
              maxHeight: "200px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "5px",
            }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <label
          style={{
            background: "#2271b1",
            color: "white",
            border: "none",
            padding: "6px 12px",
            borderRadius: "3px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "13px",
            display: "inline-block",
          }}
        >
          {uploading ? "Uploading..." : "Upload Image"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>
        <span style={{ color: "#666" }}>or</span>
        <input
          type="text"
          value={value || ""}
          onChange={handleUrlChange}
          placeholder="Enter image URL"
          style={{
            flex: 1,
            padding: "6px 10px",
            border: "1px solid #8c8f94",
            borderRadius: "3px",
            maxWidth: "400px",
          }}
        />
      </div>
    </div>
  );
}
