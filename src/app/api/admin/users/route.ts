import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { User } from "@/models/User";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const collection = await getCollection("users");
    
    // Exclude large fields that are not needed for the users list table
    // These fields are only shown in expanded details view
    const users = await collection
      .find({})
      .project({
        password: 0,
        about: 0,
        experience: 0,
        education: 0,
        profilePicture: 0,
        coverImage: 0,
        aboutTranslations: 0,
        skillsTranslations: 0,
        headlineTranslations: 0,
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      users: users.map((user: any) => {
        // Return all fields except password
        const { password, ...userWithoutPassword } = user;
        return {
          ...userWithoutPassword,
          _id: user._id.toString(),
          createdAt: user.createdAt?.toISOString(),
          updatedAt: user.updatedAt?.toISOString(),
          lastActivity: user.lastActivity?.toISOString(),
        };
      }),
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

// POST - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { email, role = "user", sendPasswordEmail = true } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const collection = await getCollection("users");

    // Check if user already exists
    const existing = await collection.findOne({
      $or: [{ email }, { username: email.split("@")[0] }],
    });

    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Generate username from email
    const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Check if username already exists, if so append random number
    let finalUsername = username;
    let usernameExists = await collection.findOne({ username: finalUsername });
    if (usernameExists) {
      finalUsername = `${username}${Math.floor(Math.random() * 1000)}`;
    }

    // Generate random password
    const password = crypto.randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "").substring(0, 12);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const now = new Date();
    const newUser: Omit<User, "_id"> = {
      username: finalUsername,
      email,
      password: hashedPassword,
      role: role as "admin" | "moderator" | "editor" | "user",
      displayName: email.split("@")[0],
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newUser);

    // Send email with credentials
    let emailSent = false;
    let emailError = null;

    if (sendPasswordEmail) {
      // Determine base URL for email links
      let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      if (!baseUrl || baseUrl.includes("localhost")) {
        try {
          const url = new URL(request.url);
          if (url.host && !url.host.includes("localhost")) {
            baseUrl = `${url.protocol}//${url.host}`;
          }
        } catch (e) {
          const host = request.headers.get("host");
          const protocol = request.headers.get("x-forwarded-proto") || "https";
          if (host && !host.includes("localhost")) {
            baseUrl = `${protocol}://${host}`;
          } else if (process.env.VERCEL_URL) {
            baseUrl = `https://${process.env.VERCEL_URL}`;
          } else {
            baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
          }
        }
      }

      const loginUrl = `${baseUrl}/me/login`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #E23F65; margin-bottom: 20px;">Welcome to ABGC Platform</h2>
          <p>Your account has been created by an administrator.</p>
          <p><strong>Your login credentials:</strong></p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Username:</strong> ${finalUsername}</p>
            <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
          </div>
          <p>Please log in at: <a href="${loginUrl}" style="color: #E23F65;">${loginUrl}</a></p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">For security reasons, please change your password after your first login.</p>
        </div>
      `;

      const emailResult = await sendEmail({
        to: email,
        subject: "Your ABGC Platform Account Credentials",
        html: emailHtml,
      });

      emailSent = emailResult.success;
      emailError = emailResult.error || null;
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: result.insertedId.toString(),
        username: finalUsername,
        email,
        role: newUser.role,
      },
      password: sendPasswordEmail ? password : undefined, // Only return password if email was not sent
      emailSent,
      emailError,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
