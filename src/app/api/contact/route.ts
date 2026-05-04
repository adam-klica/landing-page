import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Email configuration
    const recipientEmail = "teodorsljukic@gmail.com";
    const subject = `Contact Form Submission from ${name}`;
    
    // Email body
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #B53251;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This email was sent from the contact form on ${process.env.NEXT_PUBLIC_BASE_URL || 'the website'}.</p>
      </div>
    `;

    // Try to send email
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject,
      html: emailBody,
      from: "ABGC Contact <onboarding@resend.dev>",
      replyTo: email,
    });

    // Save to database as backup
    try {
      const { getCollection } = await import("@/lib/db");
      const contactCollection = await getCollection("contact_submissions");
      await contactCollection.insertOne({
        name,
        email,
        message,
        recipientEmail,
        subject,
        createdAt: new Date(),
        sent: emailResult.success,
      });
      console.log("✅ Contact submission saved to database");
    } catch (dbError: any) {
      console.error("❌ Failed to save to database:", dbError.message);
    }

    if (emailResult.success) {
      return NextResponse.json({ 
        success: true, 
        message: "Your message has been sent successfully!" 
      });
    } else {
      // Still return success, but indicate email wasn't sent
      return NextResponse.json({ 
        success: true, 
        message: "Your message has been received. We will contact you soon.",
        emailSent: false,
        warning: "Email service not configured. Message saved for manual processing."
      });
    }
  } catch (error: any) {
    console.error("Error processing contact form:", error);
    return NextResponse.json(
      { error: "Failed to send message", details: error.message },
      { status: 500 }
    );
  }
}
