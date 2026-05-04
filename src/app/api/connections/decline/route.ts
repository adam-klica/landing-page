import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST - Odbijanje zahteva za konekciju
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

    const db = await getDb();
    const userId = new ObjectId(currentUser.userId);

    // Pronađi zahtev gde je trenutni korisnik target (connectionId)
    const connection = await db.collection("connections").findOne({
      _id: new ObjectId(connectionId),
      connectionId: userId,
      status: "pending",
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Connection request not found" },
        { status: 404 }
      );
    }

    // Ažuriraj status na "declined"
    await db.collection("connections").updateOne(
      { _id: new ObjectId(connectionId) },
      {
        $set: {
          status: "declined",
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ message: "Connection request declined" });
  } catch (error) {
    console.error("Error declining connection request:", error);
    return NextResponse.json(
      { error: "Failed to decline connection request" },
      { status: 500 }
    );
  }
}
