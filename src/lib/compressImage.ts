"use client";
import imageCompression from "browser-image-compression";

export async function compressImage(
  file: File,
  opts?: { maxSizeMB?: number; maxWidthOrHeight?: number }
): Promise<File> {
  if (!file || !file.type) return file;
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: opts?.maxSizeMB ?? 1.5,
      maxWidthOrHeight: opts?.maxWidthOrHeight ?? 2048,
      useWebWorker: true,
      initialQuality: 0.85,
    });
    if (compressed.size >= file.size) return file;
    return new File([compressed], file.name, {
      type: compressed.type,
      lastModified: Date.now(),
    });
  } catch (e) {
    console.warn("compressImage failed, sending original", e);
    return file;
  }
}
