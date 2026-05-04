import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const collection = await getCollection("users");
    const user = await collection.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    // In production, you would send an email here
    if (user) {
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

      // Send email with reset link
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
      
      const emailResult = await sendEmail({
        to: email,
        subject: "Reset Your Password - ABGC",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #E23F65;">Password Reset Request</h2>
            <p>You requested to reset your password for your ABGC account.</p>
            <p>Click the link below to reset your password:</p>
            <p style="margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #E23F65; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600;">
                Reset Password
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">This link will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you did not request this password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Adriatic Blue Growth Cluster (ABGC)</p>
          </div>
        `,
      });

      if (!emailResult.success) {
        console.error(`[FORGOT PASSWORD] Failed to send email to ${email}:`, emailResult.error);
        // Still return success to prevent email enumeration
      } else {
        console.log(`[FORGOT PASSWORD] Password reset email sent to ${email}`);
      }
    }

    // Always return success (security best practice)
    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error: any) {
    console.error("Error in forgot-password:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
