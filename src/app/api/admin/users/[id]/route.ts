import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { invalidateUser } from "@/lib/userCache";

// PUT - Update user (role change)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await requireAdmin();

    // Handle params as Promise (Next.js 16) or direct object
    const resolvedParams = params instanceof Promise ? await params : params;

    const body = await request.json();
    const collection = await getCollection("users");

    const update: any = {
      updatedAt: new Date(),
    };

    if (body.role) {
      update.role = body.role;
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(resolvedParams.id) },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    invalidateUser(resolvedParams.id);

    const updated = await collection.findOne({
      _id: new ObjectId(resolvedParams.id),
    });

    return NextResponse.json({
      user: {
        _id: updated!._id.toString(),
        username: updated!.username,
        email: updated!.email,
        role: updated!.role,
        displayName: updated!.displayName || updated!.username,
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await requireAdmin();

    // Handle params as Promise (Next.js 16) or direct object
    const resolvedParams = params instanceof Promise ? await params : params;

    const collection = await getCollection("users");
    const result = await collection.deleteOne({
      _id: new ObjectId(resolvedParams.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    invalidateUser(resolvedParams.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
