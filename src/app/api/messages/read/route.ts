import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST - Označi poruke kao pročitane
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, groupId } = await request.json();
    const db = await getDb();
    const userId = new ObjectId(user.userId);

    let query: any = { isRead: false };

    if (groupId) {
      query.groupId = new ObjectId(groupId);
      query.senderId = { $ne: userId };
    } else if (receiverId) {
      query.receiverId = userId;
      query.senderId = new ObjectId(receiverId);
    } else {
      return NextResponse.json({ error: "receiverId or groupId required" }, { status: 400 });
    }

    await db.collection("messages").updateMany(query, { $set: { isRead: true } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json({ error: "Failed to mark messages as read" }, { status: 500 });
  }
}
