import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

// GET - Dohvatanje profila korisnika po ID-u
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });

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

    // Ukloni password iz rezultata
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({ 
      user: {
        ...userWithoutPassword,
        status,
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
