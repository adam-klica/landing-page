import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

/**
 * Test endpoint to send a test email
 * This helps debug email sending issues
 */
export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json();
    // Default test email, but you can send to any email via request body
    const testEmail = to || "teodorsljukic@gmail.com";
    
    if (!testEmail || !testEmail.includes("@")) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid email address",
          message: "Please provide a valid email address in the 'to' field" 
        },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      to: testEmail,
      subject: "Test Email from ABGC",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #B53251;">Test Email</h2>
          <p>This is a test email from the ABGC platform.</p>
          <p>If you received this, email sending is working correctly!</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `,
      from: "ABGC Test <onboarding@resend.dev>",
    });

    return NextResponse.json({
      success: result.success,
      error: result.error,
      message: result.success 
        ? "Test email sent successfully! Check your inbox." 
        : "Failed to send test email. Check server logs for details.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        message: "Error sending test email" 
      },
      { status: 500 }
    );
  }
}
