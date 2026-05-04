import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

// POST - Track a post view
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const postIdString = resolvedParams.id;

    if (!ObjectId.isValid(postIdString)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const postId = new ObjectId(postIdString);
    const collection = await getCollection("posts");

    // Increment view count atomically
    const result = await collection.updateOne(
      { _id: postId },
      { $inc: { viewCount: 1 } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get updated view count
    const updatedPost = await collection.findOne({ _id: postId });
    
    return NextResponse.json({
      success: true,
      viewCount: updatedPost?.viewCount || 0,
    });
  } catch (error: any) {
    console.error("Error tracking post view:", error);
    return NextResponse.json(
      { error: error.message || "Failed to track view" },
      { status: 500 }
    );
  }
}
