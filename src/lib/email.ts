/**
 * Email sending utility
 * Supports multiple email services as fallback
 */

import nodemailer from "nodemailer";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html, from = "ABGC <onboarding@resend.dev>", replyTo } = options;
  const toArray = Array.isArray(to) ? to : [to];
  
  console.log("📧 Attempting to send email...");
  console.log("   To:", toArray.join(", "));
  console.log("   Subject:", subject);
  console.log("   From:", from);
  console.log("   ReplyTo:", replyTo || "none");
  
  // Convert HTML to plain text
  const plainText = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  
  // Try Gmail SMTP FIRST (if configured) - PRIMARY SERVICE
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  console.log("   SMTP config check:", {
    hasUser: !!smtpUser,
    hasPass: !!smtpPass,
    user: smtpUser ? smtpUser.substring(0, 10) + "..." : "not set",
  });
  
  if (smtpUser && smtpPass) {
    try {
      console.log("   Trying Gmail SMTP (first priority)...");
      
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      
      // Extract email from "Name <email>" format if needed
      let fromEmail = smtpUser;
      let fromName = "ABGC";
      if (from && from.includes("<")) {
        const match = from.match(/(.+?)\s*<(.+?)>/);
        if (match) {
          fromName = match[1].trim();
          fromEmail = match[2].trim();
        }
      } else if (from && !from.includes("@")) {
        fromName = from;
        fromEmail = smtpUser;
      } else if (from) {
        fromEmail = from;
      }
      
      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: toArray.join(", "),
        subject: subject,
        html: html,
        text: plainText,
        ...(replyTo && { replyTo: replyTo }),
      };
      
      console.log("   SMTP mail options:", {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        hasReplyTo: !!mailOptions.replyTo,
      });
      
      const info = await transporter.sendMail(mailOptions);
      
      console.log("✅ Email sent successfully via Gmail SMTP!");
      console.log("   Message ID:", info.messageId);
      console.log("   Response:", info.response);
      
      return { success: true };
    } catch (error: any) {
      console.error("❌ Gmail SMTP exception:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Full error:", error);
    }
  } else {
    console.warn("⚠️  Gmail SMTP not configured:", {
      user: smtpUser ? "✅" : "❌",
      pass: smtpPass ? "✅" : "❌",
    });
  }
  
  // Try EmailJS (if configured) - SECONDARY SERVICE
  const emailjsPublicKey = process.env.EMAILJS_PUBLIC_KEY;
  const emailjsServiceId = process.env.EMAILJS_SERVICE_ID;
  const emailjsTemplateId = process.env.EMAILJS_TEMPLATE_ID;
  
  console.log("   EmailJS config check:", {
    hasPublicKey: !!emailjsPublicKey,
    hasServiceId: !!emailjsServiceId,
    hasTemplateId: !!emailjsTemplateId,
    publicKeyLength: emailjsPublicKey?.length || 0,
    serviceId: emailjsServiceId,
    templateId: emailjsTemplateId,
  });
  
  if (emailjsPublicKey && emailjsServiceId && emailjsTemplateId) {
    try {
      console.log("   Trying EmailJS (first priority)...");
      
      // Extract name and email from replyTo if available (for contact form)
      let name = "User";
      let email = replyTo || toArray[0];
      if (replyTo) {
        // Try to extract name from replyTo if it's in format "Name <email>"
        const match = replyTo.match(/(.+?)\s*<(.+?)>/);
        if (match) {
          name = match[1].trim();
          email = match[2].trim();
        } else {
          email = replyTo;
        }
      }
      
      const requestBody = {
        service_id: emailjsServiceId,
        template_id: emailjsTemplateId,
        user_id: emailjsPublicKey,
        template_params: {
          // Standard fields that EmailJS templates usually use
          name: name,
          email: email,
          subject: subject,
          message: plainText,
          message_html: html,
          message_text: plainText,
          // Additional fields
          to_email: toArray[0],
          to_name: toArray[0].split('@')[0],
          reply_to: replyTo || email,
          from_email: email,
          from_name: name,
          // Also try title in case template uses it
          title: subject,
        },
      };
      
      console.log("   EmailJS request body:", JSON.stringify(requestBody, null, 2));
      
      const emailjsResponse = await fetch(`https://api.emailjs.com/api/v1.0/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      let responseText = "";
      try {
        responseText = await emailjsResponse.text();
      } catch (e) {
        responseText = "Could not read response text";
      }
      
      console.log("   EmailJS response:", {
        status: emailjsResponse.status,
        statusText: emailjsResponse.statusText,
        responseText: responseText.substring(0, 500), // First 500 chars
        headers: Object.fromEntries(emailjsResponse.headers.entries()),
      });
      
      if (emailjsResponse.ok) {
        console.log("✅ Email sent successfully via EmailJS!");
        return { success: true };
      } else {
        // Try to parse error if it's JSON
        let errorDetails = responseText;
        try {
          const errorJson = JSON.parse(responseText);
          errorDetails = JSON.stringify(errorJson, null, 2);
        } catch (e) {
          // Not JSON, use as is
        }
        
        console.error("❌ EmailJS error:", {
          status: emailjsResponse.status,
          statusText: emailjsResponse.statusText,
          error: errorDetails,
          fullResponse: responseText,
        });
      }
    } catch (error: any) {
      console.error("❌ EmailJS exception:", error.message);
      console.error("   Full error:", error);
    }
  } else {
    console.warn("⚠️  EmailJS not fully configured:", {
      publicKey: emailjsPublicKey ? "✅" : "❌",
      serviceId: emailjsServiceId ? "✅" : "❌",
      templateId: emailjsTemplateId ? "✅" : "❌",
    });
  }
  
  // Try Formspree (fallback)
  const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT;
  console.log("   Formspree config check:", { hasEndpoint: !!formspreeEndpoint });
  
  if (formspreeEndpoint) {
    try {
      console.log("   Trying Formspree (fallback)...");
      const formspreeBody = {
        _to: toArray[0],
        _subject: subject,
        _replyto: replyTo || toArray[0],
        message: plainText,
        html: html,
      };
      
      console.log("   Formspree request body:", JSON.stringify(formspreeBody, null, 2));
      
      const formspreeResponse = await fetch(formspreeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formspreeBody),
      });

      const formspreeResponseText = await formspreeResponse.text();
      
      console.log("   Formspree response:", {
        status: formspreeResponse.status,
        statusText: formspreeResponse.statusText,
        responseText: formspreeResponseText.substring(0, 200),
      });

      if (formspreeResponse.ok) {
        console.log("✅ Email sent successfully via Formspree!");
        return { success: true };
      } else {
        console.error("❌ Formspree error:", formspreeResponseText);
      }
    } catch (error: any) {
      console.error("❌ Formspree exception:", error.message);
      console.error("   Full error:", error);
    }
  }
  
  // Try Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (resendApiKey) {
    try {
      console.log("   Trying Resend API...");
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from,
          to: toArray,
          subject,
          html,
          ...(replyTo && { reply_to: replyTo }),
        }),
      });

      const responseData = await resendResponse.json();

      if (resendResponse.ok) {
        console.log("✅ Email sent successfully via Resend!");
        console.log("   Response ID:", responseData.id);
        return { success: true };
      } else {
        console.error("❌ Resend API error:", {
          status: resendResponse.status,
          statusText: resendResponse.statusText,
          error: responseData
        });
      }
    } catch (error: any) {
      console.error("❌ Resend API exception:", error.message);
    }
  }
  
  // Try webhook (if configured)
  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      console.log("   Trying webhook...");
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: toArray,
          subject,
          html,
          from,
          replyTo,
        }),
      });

      if (webhookResponse.ok) {
        console.log("✅ Email sent successfully via webhook!");
        return { success: true };
      }
    } catch (error: any) {
      console.error("❌ Webhook exception:", error.message);
    }
  }
  
  // If nothing works, at least save to database
  console.warn("⚠️  No email service configured - saving to database only");
  console.warn("   To enable email sending, configure one of:");
  console.warn("   - FORMSPREE_ENDPOINT (easiest: https://formspree.io - just get endpoint URL)");
  console.warn("   - EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID");
  console.warn("   - RESEND_API_KEY");
  console.warn("   Email details:", { to: toArray, subject });
  
  return { 
    success: false, 
    error: "No email service configured. Emails are saved to database only." 
  };
}
