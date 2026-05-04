import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

// POST - Record a profile visit
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { visitedUserId } = body;

    if (!visitedUserId) {
      return NextResponse.json(
        { error: "visitedUserId is required" },
        { status: 400 }
      );
    }

    const visitorId = new ObjectId(currentUser.userId);
    const visitedId = new ObjectId(visitedUserId);

    // Don't record if user is visiting their own profile
    if (visitorId.toString() === visitedId.toString()) {
      return NextResponse.json({ success: true, message: "Own profile visit ignored" });
    }

    const visitorsCollection = await getCollection("profile_visitors");

    // Check if visit already exists today (to avoid duplicates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingVisit = await visitorsCollection.findOne({
      visitedUserId: visitedId,
      visitorId: visitorId,
      visitedAt: { $gte: today },
    });

    if (!existingVisit) {
      // Insert new visit
      await visitorsCollection.insertOne({
        visitedUserId: visitedId,
        visitorId: visitorId,
        visitedAt: new Date(),
        createdAt: new Date(),
      });
    } else {
      // Update existing visit timestamp
      await visitorsCollection.updateOne(
        { _id: existingVisit._id },
        { $set: { visitedAt: new Date() } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error recording profile visit:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record visit" },
      { status: 500 }
    );
  }
}

// GET - Get list of profile visitors
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const visitorsCollection = await getCollection("profile_visitors");
    const usersCollection = await getCollection("users");
    const userId = new ObjectId(currentUser.userId);

    // Get all visitors to current user's profile, sorted by most recent visit
    const allVisitors = await visitorsCollection
      .find({
        visitedUserId: userId,
      })
      .sort({ visitedAt: -1 })
      .toArray();

    // Group by visitorId and keep only the most recent visit for each visitor
    const visitorMap = new Map();
    allVisitors.forEach((visitor) => {
      const visitorIdStr = visitor.visitorId.toString();
      if (!visitorMap.has(visitorIdStr)) {
        visitorMap.set(visitorIdStr, visitor);
      } else {
        // Keep the most recent visit
        const existing = visitorMap.get(visitorIdStr);
        if (new Date(visitor.visitedAt) > new Date(existing.visitedAt)) {
          visitorMap.set(visitorIdStr, visitor);
        }
      }
    });

    // Convert map to array and sort by most recent visit
    const uniqueVisitors = Array.from(visitorMap.values())
      .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
      .slice(0, limit);

    // Get user details for each unique visitor
    const visitorIds = uniqueVisitors.map((v) => v.visitorId);
    const visitorUsers = await usersCollection
      .find({
        _id: { $in: visitorIds },
      })
      .project({ username: 1, displayName: 1, profilePicture: 1 })
      .toArray();

    // Create a map for quick lookup
    const userMap = new Map();
    visitorUsers.forEach((user) => {
      userMap.set(user._id.toString(), {
        _id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        profilePicture: user.profilePicture,
      });
    });

    // Combine visitor data with user info
    const visitorsWithUserInfo = uniqueVisitors
      .map((visitor) => {
        const user = userMap.get(visitor.visitorId.toString());
        if (!user) return null;
        return {
          _id: visitor._id.toString(),
          visitor: user,
          visitedAt: visitor.visitedAt,
        };
      })
      .filter((v) => v !== null);

    return NextResponse.json({
      visitors: visitorsWithUserInfo,
      count: visitorsWithUserInfo.length,
    });
  } catch (error: any) {
    console.error("Error fetching profile visitors:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch visitors" },
      { status: 500 }
    );
  }
}
