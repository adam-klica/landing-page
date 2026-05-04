import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import bcrypt from "bcryptjs";
import { User } from "@/models/User";

export async function POST() {
  try {
    const collection = await getCollection("users");

    // Check if any admin already exists
    const existingAdmin = await collection.findOne({ role: "admin" });
    if (existingAdmin) {
      return NextResponse.json(
        { message: "Admin user already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("admin", 10);

    const now = new Date();
    const adminUser: Omit<User, "_id"> = {
      username: "admin",
      email: "admin@abgc.local",
      password: hashedPassword,
      role: "admin",
      displayName: "Administrator",
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(adminUser);

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      user: {
        _id: result.insertedId.toString(),
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
