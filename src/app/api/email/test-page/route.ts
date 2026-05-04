import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

/**
 * Simple test endpoint that sends email to teodorsljukic@gmail.com
 * Just call: GET /api/email/test-page
 */
export async function GET() {
  try {
    const testEmail = "teodorsljukic@gmail.com";
    
    console.log("🧪 Sending test email to:", testEmail);
    
    const result = await sendEmail({
      to: testEmail,
      subject: "Test Email from ABGC Platform",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #B53251;">✅ Test Email Successful!</h2>
          <p>This is a test email from the ABGC platform.</p>
          <p>If you received this email, it means Gmail SMTP is working correctly!</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>To:</strong> ${testEmail}</p>
            <p style="margin: 5px 0;"><strong>From:</strong> Gmail SMTP (skillslms2@gmail.com)</p>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated test email. Email functionality is working! 🎉
          </p>
        </div>
      `,
      from: "ABGC Test <skillslms2@gmail.com>",
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `✅ Test email sent successfully to ${testEmail}! Check your inbox.`,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: "❌ Failed to send test email. Check server logs for details.",
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        message: "❌ Error sending test email" 
      },
      { status: 500 }
    );
  }
}
