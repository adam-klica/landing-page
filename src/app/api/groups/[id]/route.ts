import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET - Dohvati grupu po ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();
    const userId = new ObjectId(user.userId);

    const group = await db.collection("groups").findOne({ _id: new ObjectId(id) });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if user is member
    if (!group.members.some((m: any) => m.toString() === user.userId)) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // Populate members
    const members = await db
      .collection("users")
      .find({ _id: { $in: group.members.map((m: any) => new ObjectId(m.toString())) } })
      .project({ username: 1, displayName: 1, profilePicture: 1, headline: 1 })
      .toArray();

    const memberMap = new Map(members.map((m) => [m._id.toString(), m]));

    return NextResponse.json({
      _id: group._id.toString(),
      name: group.name,
      description: group.description,
      createdBy: group.createdBy.toString(),
      members: group.members.map((m: any) => {
        const member = memberMap.get(m.toString());
        return member
          ? {
              _id: member._id.toString(),
              username: member.username,
              displayName: member.displayName,
              profilePicture: member.profilePicture,
            }
          : null;
      }),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

// DELETE - Obriši grupu
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();

    const group = await db.collection("groups").findOne({ _id: new ObjectId(id) });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Only creator can delete
    if (group.createdBy.toString() !== user.userId) {
      return NextResponse.json({ error: "Only creator can delete group" }, { status: 403 });
    }

    await db.collection("groups").deleteOne({ _id: new ObjectId(id) });
    await db.collection("messages").deleteMany({ groupId: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
