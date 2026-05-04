import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

// POST - Send password reset link to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await requireAdmin();

    const resolvedParams = params instanceof Promise ? await params : params;
    const userId = resolvedParams.id;

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const collection = await getCollection("users");
    const user = await collection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setMinutes(resetTokenExpiry.getMinutes() + 10); // Token valid for 10 minutes

    // Save reset token to database
    await collection.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpiry: resetTokenExpiry,
        },
      }
    );

    // Generate reset link (default to 'me' locale, user can change it)
    // Try to get base URL from environment variable, request headers, or fallback
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!baseUrl || baseUrl.includes("localhost")) {
      // Try to get from request URL
      try {
        const url = new URL(request.url);
        if (url.host && !url.host.includes("localhost")) {
          baseUrl = `${url.protocol}//${url.host}`;
        }
      } catch (e) {
        // If URL parsing fails, try headers
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
    
    const resetLink = `${baseUrl}/me/reset-password?token=${resetToken}`;

    // Send email with reset link
    const emailResult = await sendEmail({
      to: user.email,
      subject: "Reset Your Password - ABGC (Admin Request)",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #E23F65;">Password Reset Request</h2>
          <p>An administrator has requested to reset your password for your ABGC account.</p>
          <p>Click the link below to reset your password:</p>
          <p style="margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #E23F65; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600;">
              Reset Password
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">This link will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you did not request this password reset, please contact support.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Adriatic Blue Growth Cluster (ABGC)</p>
        </div>
      `,
    });

    if (!emailResult.success) {
      console.error(`[ADMIN RESET PASSWORD] Failed to send email to ${user.email}:`, emailResult.error);
      // Still return the link so admin can manually send it
      return NextResponse.json({
        success: true,
        message: "Password reset link generated, but email sending failed",
        resetLink: resetLink,
        email: user.email,
        emailSent: false,
        error: emailResult.error,
      });
    }

    console.log(`[ADMIN RESET PASSWORD] Password reset email sent to ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Password reset link generated and email sent",
      resetLink: resetLink,
      email: user.email,
      emailSent: true,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error generating reset password link:", error);
    return NextResponse.json(
      { error: "Failed to generate reset password link" },
      { status: 500 }
    );
  }
}
