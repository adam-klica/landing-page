import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// POST - Dodaj člana u grupu
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { userId: newMemberId } = await request.json();

    if (!newMemberId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

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

    const newMemberObjectId = new ObjectId(newMemberId);

    // Check if already member
    if (group.members.some((m: any) => m.toString() === newMemberId)) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 });
    }

    await db.collection("groups").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { members: newMemberObjectId } as any,
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding member:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}

// DELETE - Ukloni člana iz grupe
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
    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("userId");

    if (!memberId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const db = await getDb();

    const group = await db.collection("groups").findOne({ _id: new ObjectId(id) });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Only creator or the member themselves can remove
    if (group.createdBy.toString() !== user.userId && memberId !== user.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await db.collection("groups").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { members: new ObjectId(memberId) } as any,
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
