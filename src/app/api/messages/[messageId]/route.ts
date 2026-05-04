import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// PUT - Update message
export async function PUT(
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
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message text is required" }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(user.userId);
    const msgId = new ObjectId(messageId);

    // Get the message
    const existingMessage = await db.collection("messages").findOne({ _id: msgId });
    if (!existingMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if user is the sender
    if (existingMessage.senderId.toString() !== user.userId) {
      return NextResponse.json({ error: "You can only edit your own messages" }, { status: 403 });
    }

    // Update message
    await db.collection("messages").updateOne(
      { _id: msgId },
      { 
        $set: { 
          message: message.trim(),
          editedAt: new Date()
        } 
      }
    );

    // Get updated message
    const updatedMessage = await db.collection("messages").findOne({ _id: msgId });

    return NextResponse.json({
      success: true,
      message: updatedMessage?.message,
      editedAt: updatedMessage?.editedAt
    });
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}
