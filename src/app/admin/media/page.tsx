"use client";

import { useState, useEffect } from "react";
import { CMSLayout } from "@/components/CMSLayout";
import { AdminGuard } from "@/components/AdminGuard";
import { getTranslations } from "@/lib/getTranslations";
import { defaultLocale, locales, type Locale } from "@/lib/i18n";
import { getStoredCmsLocale } from "@/lib/cmsLocale";

interface MediaFile {
  filename: string;
  url: string;
  size: number;
  createdAt: string;
  type?: string;
  extension?: string;
}

export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [cmsLocale, setCmsLocale] = useState<Locale>(defaultLocale);
  const t = getTranslations(cmsLocale);

  useEffect(() => {
    setCmsLocale(getStoredCmsLocale());
    loadMedia();
  }, []);

  async function loadMedia() {
    setLoading(true);
    try {
      const res = await fetch("/api/media");
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error loading media:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        loadMedia();
        e.target.value = ""; // Reset input
      } else {
        const error = await res.json();
        alert(`${t.cms.errorLabel}: ${error.error}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(`${t.cms.uploading}: ${t.cms.unknownError}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(filename: string) {
    if (!confirm(t.cms.deleteFileConfirm)) {
      return;
    }

    setDeleting(filename);
    try {
      const encodedFilename = encodeURIComponent(filename);
      const res = await fetch(`/api/media/${encodedFilename}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadMedia();
      } else {
        const error = await res.json();
        alert(`${t.cms.errorLabel}: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert(`${t.cms.deleteFile}: ${t.cms.unknownError}`);
    } finally {
      setDeleting(null);
    }
  }

  function getFileIcon(file: MediaFile) {
    if (file.type === "image") {
      return "🖼️";
    } else if (file.type === "pdf") {
      return "📄";
    } else if (file.type === "document") {
      return "📝";
    } else if (file.type === "video") {
      return "🎥";
    } else if (file.type === "audio") {
      return "🎵";
    } else if (file.type === "archive") {
      return "📦";
    } else {
      return "📎";
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert(t.cms.urlCopied);
  }

  return (
    <AdminGuard>
      <CMSLayout>
        <div style={{ background: "white", padding: "20px", borderRadius: "4px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h1 style={{ margin: 0, fontSize: "23px", fontWeight: "400" }}>
              {t.cms.mediaLibrary}
            </h1>
            <label
              style={{
                background: "#2271b1",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "3px",
                cursor: uploading ? "not-allowed" : "pointer",
                fontSize: "14px",
                display: "inline-block",
              }}
            >
              {uploading ? t.cms.uploading : t.cms.uploadFile}
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <div
                style={{
                  display: "inline-block",
                  width: "30px",
                  height: "30px",
                  border: "3px solid #2271b1",
                  borderTop: "3px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "20px",
              }}
            >
              {files.map((file) => (
                <div
                  key={file.filename}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    overflow: "hidden",
                    transition: "transform 0.2s",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteFile(file.filename)}
                    disabled={deleting === file.filename}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "rgba(220, 53, 69, 0.9)",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "28px",
                      height: "28px",
                      cursor: deleting === file.filename ? "not-allowed" : "pointer",
                      fontSize: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                      opacity: deleting === file.filename ? 0.6 : 1,
                    }}
                    title={t.cms.deleteFile}
                  >
                    {deleting === file.filename ? "..." : "×"}
                  </button>

                  <div
                    style={{
                      width: "100%",
                      paddingTop: "100%",
                      position: "relative",
                      background: "#f0f0f0",
                    }}
                  >
                    {file.type === "image" ? (
                      <img
                        src={file.url}
                        alt={file.filename}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "48px",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }}
                      >
                        {getFileIcon(file)}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginBottom: "5px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={file.filename}
                    >
                      {file.filename}
                    </div>
                    <div style={{ fontSize: "11px", color: "#999", marginBottom: "8px" }}>
                      {formatFileSize(file.size)} {file.extension && `• ${file.extension.toUpperCase()}`}
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={() => copyToClipboard(file.url)}
                        style={{
                          flex: 1,
                          padding: "6px",
                          background: "#2271b1",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        {t.cms.copyUrl}
                      </button>
                      {file.type !== "image" && (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1,
                            padding: "6px",
                            background: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "12px",
                            textAlign: "center",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {t.cms.open}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && files.length === 0 && (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "#666",
              }}
            >
              <p style={{ fontSize: "18px", marginBottom: "10px" }}>
                {t.cms.noMediaFiles}
              </p>
              <p style={{ fontSize: "14px" }}>
                {t.cms.uploadFirstFile}
              </p>
            </div>
          )}
        </div>
      </CMSLayout>
    </AdminGuard>
  );
}
