import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

const MIN_UPDATE_GAP_MS = 4 * 60 * 1000;

// POST - Update user activity
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      // Return success even if unauthorized to prevent error spam
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 200 });
    }

    const db = await getDb();
    const userId = new ObjectId(user.userId);
    const now = new Date();
    const cutoff = new Date(now.getTime() - MIN_UPDATE_GAP_MS);

    // Server-side throttle: only write if last update older than cutoff.
    try {
      await db.collection("users").updateOne(
        { _id: userId, $or: [{ lastActivity: { $lt: cutoff } }, { lastActivity: { $exists: false } }] },
        {
          $set: {
            lastActivity: now,
            status: "online",
          },
        }
      );
    } catch (dbError: any) {
      console.error("Database error updating activity:", dbError);
      // Return success even on DB error to prevent client-side error loops
      return NextResponse.json({ success: false, error: "Database error" }, { status: 200 });
    }

    return NextResponse.json({ success: true, lastActivity: now });
  } catch (error: any) {
    console.error("Error updating activity:", error);
    // Return 200 to prevent client-side error loops
    return NextResponse.json(
      { success: false, error: "Failed to update activity" },
      { status: 200 }
    );
  }
}

// GET - Get user status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate status based on last activity
    let status: "online" | "away" | "offline" = "offline";
    if (user.lastActivity) {
      const now = new Date();
      const diff = now.getTime() - new Date(user.lastActivity).getTime();
      const minutesAgo = diff / (1000 * 60);

      if (minutesAgo < 5) {
        status = "online";
      } else if (minutesAgo < 30) {
        status = "away";
      } else {
        status = "offline";
      }
    }

    return NextResponse.json({
      status,
      lastActivity: user.lastActivity,
    });
  } catch (error: any) {
    console.error("Error getting user status:", error);
    return NextResponse.json(
      { error: "Failed to get user status" },
      { status: 500 }
    );
  }
}
