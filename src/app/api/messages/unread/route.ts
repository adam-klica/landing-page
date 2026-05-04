import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET - Dohvati broj nepročitanih poruka
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const userId = new ObjectId(user.userId);

    // Privatne poruke
    const privateUnread = await db
      .collection("messages")
      .aggregate([
        {
          $match: {
            receiverId: userId,
            isRead: false,
            groupId: null,
          },
        },
        {
          $group: {
            _id: "$senderId",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const unreadUsers: Record<string, number> = {};
    privateUnread.forEach((item) => {
      unreadUsers[item._id.toString()] = item.count;
    });

    // Grupne poruke
    const userGroups = await db
      .collection("groups")
      .find({ members: userId })
      .toArray();

    const groupIds = userGroups.map((g) => g._id);

    const groupUnread = await db
      .collection("messages")
      .aggregate([
        {
          $match: {
            groupId: { $in: groupIds },
            senderId: { $ne: userId },
            isRead: false,
          },
        },
        {
          $group: {
            _id: "$groupId",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const unreadGroups: Record<string, number> = {};
    groupUnread.forEach((item) => {
      unreadGroups[item._id.toString()] = item.count;
    });

    return NextResponse.json({
      users: unreadUsers,
      groups: unreadGroups,
    });
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    return NextResponse.json({ error: "Failed to fetch unread counts" }, { status: 500 });
  }
}
