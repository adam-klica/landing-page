import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET - Dohvati sve grupe korisnika
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const userId = new ObjectId(user.userId);

    const groups = await db
      .collection("groups")
      .find({ members: userId })
      .toArray();

    // Populate member info
    const allMemberIds = new Set<string>();
    groups.forEach((group) => {
      group.members.forEach((m: any) => allMemberIds.add(m.toString()));
    });

    const members = await db
      .collection("users")
      .find({ _id: { $in: Array.from(allMemberIds).map((id) => new ObjectId(id)) } })
      .project({ username: 1, displayName: 1, profilePicture: 1 })
      .toArray();

    const memberMap = new Map(members.map((m) => [m._id.toString(), m]));

    const groupsWithMembers = groups.map((group) => ({
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
    }));

    return NextResponse.json({ groups: groupsWithMembers });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

// POST - Kreiraj novu grupu
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, memberIds } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(user.userId);

    const memberObjectIds = [
      userId,
      ...(memberIds || []).map((id: string) => new ObjectId(id)),
    ];

    const group = {
      name: name.trim(),
      description: description || "",
      createdBy: userId,
      members: memberObjectIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("groups").insertOne(group);

    return NextResponse.json({
      _id: result.insertedId.toString(),
      ...group,
      createdBy: group.createdBy.toString(),
      members: group.members.map((m) => m.toString()),
    });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
