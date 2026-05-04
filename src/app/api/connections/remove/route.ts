import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST - Uklanjanje prihvaćene veze
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

    // Pronađi vezu gde je trenutni korisnik učesnik
    const connection = await db.collection("connections").findOne({
      _id: new ObjectId(connectionId),
      status: "accepted",
      $or: [
        { userId: userId },
        { connectionId: userId },
      ],
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    // Obriši vezu
    await db.collection("connections").deleteOne({
      _id: new ObjectId(connectionId),
    });

    return NextResponse.json({ message: "Connection removed successfully" });
  } catch (error) {
    console.error("Error removing connection:", error);
    return NextResponse.json(
      { error: "Failed to remove connection" },
      { status: 500 }
    );
  }
}
