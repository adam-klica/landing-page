import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Missing username or password" },
        { status: 400 }
      );
    }

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in environment variables");
      return NextResponse.json(
        { error: "Server configuration error. Please contact administrator." },
        { status: 500 }
      );
    }

    let collection;
    try {
      collection = await getCollection("users");
    } catch (dbError: any) {
      console.error("Database connection error:", dbError);
      // Check if it's a MongoDB URI error
      if (dbError.message?.includes("MONGODB_URI")) {
        return NextResponse.json(
          { error: "Database configuration error. Please check server logs." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "Database connection failed. Please try again later." },
        { status: 500 }
      );
    }

    // Find user by username or email
    let user;
    try {
      user = await collection.findOne({
        $or: [{ username }, { email: username }],
      });
    } catch (findError: any) {
      console.error("Error finding user:", findError);
      return NextResponse.json(
        { error: "Database query failed. Please try again later." },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    let isValid;
    try {
      isValid = await bcrypt.compare(password, user.password);
    } catch (bcryptError: any) {
      console.error("Error comparing password:", bcryptError);
      return NextResponse.json(
        { error: "Password verification failed. Please try again." },
        { status: 500 }
      );
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create token
    let token;
    try {
      token = createToken({
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
      });
    } catch (tokenError: any) {
      console.error("Error creating token:", tokenError);
      return NextResponse.json(
        { error: "Token creation failed. Please try again." },
        { status: 500 }
      );
    }

    // Set cookie
    const response = NextResponse.json({
      user: {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.displayName || user.username,
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    // Don't expose internal error details to client
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
