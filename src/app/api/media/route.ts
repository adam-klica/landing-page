import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCollection } from "@/lib/db";
import { Media } from "@/models/Media";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const mediaCollection = await getCollection("media");
    const files = await mediaCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const formattedFiles = files.map((file: any) => ({
      filename: file.filename,
      url: file.url,
      size: file.size,
      createdAt: file.createdAt?.toISOString() || new Date().toISOString(),
      type: file.type || "other",
      extension: file.extension,
      _id: file._id?.toString(),
    }));

    return NextResponse.json({ files: formattedFiles });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error loading media:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load media" },
      { status: 500 }
    );
  }
}
