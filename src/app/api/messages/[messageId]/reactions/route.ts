import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST - Dodaj ili ukloni reakciju
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const messageId = resolvedParams.messageId;
    const { emoji } = await request.json();

    if (!emoji) {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(user.userId);
    const msgId = new ObjectId(messageId);

    // Get the message
    const message = await db.collection("messages").findOne({ _id: msgId });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const reactions = message.reactions || [];
    
    // Check if user already reacted with this emoji
    const existingReactionIndex = reactions.findIndex(
      (r: any) => r.userId.toString() === user.userId && r.emoji === emoji
    );

    if (existingReactionIndex >= 0) {
      // Remove reaction (clicking same emoji removes it)
      reactions.splice(existingReactionIndex, 1);
    } else {
      // Remove any existing reaction from this user (only one emoji per user)
      const userReactionIndex = reactions.findIndex(
        (r: any) => r.userId.toString() === user.userId
      );
      if (userReactionIndex >= 0) {
        reactions.splice(userReactionIndex, 1);
      }
      // Add new reaction
      reactions.push({
        emoji,
        userId: userId,
      });
    }

    // Update message
    await db.collection("messages").updateOne(
      { _id: msgId },
      { $set: { reactions } }
    );

    return NextResponse.json({ 
      success: true,
      reactions 
    });
  } catch (error) {
    console.error("Error updating reaction:", error);
    return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
  }
}
