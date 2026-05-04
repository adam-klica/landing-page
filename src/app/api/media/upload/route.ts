import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";
import { getCollection } from "@/lib/db";
import { Media } from "@/models/Media";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Blob storage not configured (BLOB_READ_WRITE_TOKEN)" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({
        error: "File too large",
        details: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (25MB)`,
      }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pathname = `media/${timestamp}-${safeName}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    let fileType = "other";
    if (file.type.startsWith("image/")) fileType = "image";
    else if (file.type === "application/pdf") fileType = "pdf";
    else if (file.type.includes("document") || file.type.includes("word") || file.type.includes("text")) fileType = "document";
    else if (file.type.startsWith("video/")) fileType = "video";
    else if (file.type.startsWith("audio/")) fileType = "audio";
    else if (file.type.includes("zip") || file.type.includes("archive") || file.type.includes("compressed")) fileType = "archive";

    const mediaCollection = await getCollection("media");
    const mediaDoc: Omit<Media, "_id"> = {
      filename: blob.pathname,
      originalName: file.name,
      url: blob.url,
      size: file.size,
      type: fileType,
      extension,
      createdAt: new Date(),
      createdBy: user.userId,
    };

    const result = await mediaCollection.insertOne(mediaDoc);

    return NextResponse.json({
      url: blob.url,
      filename: blob.pathname,
      originalName: file.name,
      size: file.size,
      type: fileType,
      extension,
      _id: result.insertedId.toString(),
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
