import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST - Pin or unpin message
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
    const { pin } = await request.json();

    if (typeof pin !== "boolean") {
      return NextResponse.json({ error: "pin parameter is required (true/false)" }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(user.userId);
    const msgId = new ObjectId(messageId);

    // Get the message
    const message = await db.collection("messages").findOne({ _id: msgId });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if user has permission to pin (must be in the same chat)
    let hasPermission = false;
    if (message.groupId) {
      // For group messages, check if user is a member
      const group = await db.collection("groups").findOne({ _id: message.groupId });
      if (group && group.members.some((m: any) => m.toString() === user.userId)) {
        hasPermission = true;
      }
    } else if (message.receiverId) {
      // For private messages, check if user is sender or receiver
      hasPermission = 
        message.senderId.toString() === user.userId ||
        message.receiverId.toString() === user.userId;
    }

    if (!hasPermission) {
      return NextResponse.json({ error: "You don't have permission to pin this message" }, { status: 403 });
    }

    // Update message
    const updateData: any = { isPinned: pin };
    if (pin) {
      updateData.pinnedAt = new Date();
      updateData.pinnedBy = userId;
    } else {
      updateData.pinnedAt = null;
      updateData.pinnedBy = null;
    }

    await db.collection("messages").updateOne(
      { _id: msgId },
      { $set: updateData }
    );

    return NextResponse.json({ 
      success: true,
      isPinned: pin
    });
  } catch (error) {
    console.error("Error pinning/unpinning message:", error);
    return NextResponse.json({ error: "Failed to pin/unpin message" }, { status: 500 });
  }
}
