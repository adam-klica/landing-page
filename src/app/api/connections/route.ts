import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET - Lista svih konekcija i zahteva za trenutnog korisnika
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const userId = new ObjectId(currentUser.userId);
    
    const connections = await db
      .collection("connections")
      .find({
        $or: [
          { userId: userId },
          { connectionId: userId },
        ],
      })
      .toArray();

    // Učitaj podatke o korisnicima
    const userIds = new Set<string>();
    connections.forEach((conn) => {
      userIds.add(conn.userId?.toString() || String(conn.userId));
      userIds.add(conn.connectionId?.toString() || String(conn.connectionId));
    });

    const users = await db
      .collection("users")
      .find({
        _id: { $in: Array.from(userIds).map((id) => new ObjectId(id)) },
      })
      .project({
        username: 1,
        email: 1,
        displayName: 1,
        profilePicture: 1,
        headline: 1,
      })
      .toArray();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const connectionsWithUsers = connections.map((conn) => {
      const connUserId = conn.userId?.toString();
      const connConnectionId = conn.connectionId?.toString();
      const currentUserId = userId.toString();
      
      const otherUserId =
        connUserId === currentUserId ? connConnectionId : connUserId;
      const otherUser = userMap.get(otherUserId);

      const isIncoming = connConnectionId === currentUserId;

      return {
        _id: conn._id.toString(),
        status: conn.status,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
        user: otherUser
          ? {
              _id: otherUser._id.toString(),
              username: otherUser.username,
              email: otherUser.email,
              displayName: otherUser.displayName,
              profilePicture: otherUser.profilePicture,
              headline: otherUser.headline,
            }
          : null,
        isIncoming: isIncoming,
      };
    });

    return NextResponse.json({ connections: connectionsWithUsers });
  } catch (error) {
    console.error("Error fetching connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    );
  }
}
