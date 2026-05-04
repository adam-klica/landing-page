import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST - Slanje zahteva za konekciju
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectionId } = await request.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      );
    }

    if (connectionId === currentUser.userId) {
      return NextResponse.json(
        { error: "Cannot send connection request to yourself" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userId = new ObjectId(currentUser.userId);

    // Proveri da li već postoji konekcija ili zahtev
    const existing = await db.collection("connections").findOne({
      $or: [
        { userId: userId, connectionId: new ObjectId(connectionId) },
        { userId: new ObjectId(connectionId), connectionId: userId },
      ],
    });

    if (existing) {
      return NextResponse.json(
        { error: "Connection already exists or request is pending" },
        { status: 400 }
      );
    }

    // Proveri da li korisnik postoji
    const targetUser = await db
      .collection("users")
      .findOne({ _id: new ObjectId(connectionId) });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Kreiraj zahtev
    const connection = {
      userId: userId,
      connectionId: new ObjectId(connectionId),
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("connections").insertOne(connection);

    return NextResponse.json({
      message: "Connection request sent",
      connectionId: result.insertedId,
    });
  } catch (error) {
    console.error("Error sending connection request:", error);
    return NextResponse.json(
      { error: "Failed to send connection request" },
      { status: 500 }
    );
  }
}
