import { NextResponse } from "next/server";

/**
 * Test endpoint to check email service configuration
 * This helps debug which email services are configured
 */
export async function GET() {
  // Get all environment variables (for debugging)
  const allEnvKeys = Object.keys(process.env);
  const emailRelatedKeys = allEnvKeys.filter(key => 
    key.includes('SMTP') || 
    key.includes('EMAIL') || 
    key.includes('RESEND') ||
    key.includes('FORMSPREE') ||
    key.includes('WEBHOOK')
  );
  
  const config = {
    smtp: {
      configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      user: process.env.SMTP_USER ? `✅ Set (${process.env.SMTP_USER.substring(0, 10)}...)` : "❌ Not set",
      pass: process.env.SMTP_PASS ? "✅ Set (hidden)" : "❌ Not set",
      rawUser: process.env.SMTP_USER || null,
      rawPass: process.env.SMTP_PASS ? "***" : null,
    },
    emailjs: {
      configured: !!(
        process.env.EMAILJS_PUBLIC_KEY &&
        process.env.EMAILJS_SERVICE_ID &&
        process.env.EMAILJS_TEMPLATE_ID
      ),
      publicKey: process.env.EMAILJS_PUBLIC_KEY ? "✅ Set" : "❌ Not set",
      serviceId: process.env.EMAILJS_SERVICE_ID ? "✅ Set" : "❌ Not set",
      templateId: process.env.EMAILJS_TEMPLATE_ID ? "✅ Set" : "❌ Not set",
    },
    formspree: {
      configured: !!process.env.FORMSPREE_ENDPOINT,
      endpoint: process.env.FORMSPREE_ENDPOINT ? "✅ Set" : "❌ Not set",
    },
    resend: {
      configured: !!process.env.RESEND_API_KEY,
      apiKey: process.env.RESEND_API_KEY ? "✅ Set" : "❌ Not set",
    },
    webhook: {
      configured: !!process.env.EMAIL_WEBHOOK_URL,
      url: process.env.EMAIL_WEBHOOK_URL ? "✅ Set" : "❌ Not set",
    },
  };

  const hasAnyService = 
    config.smtp.configured ||
    config.emailjs.configured ||
    config.formspree.configured ||
    config.resend.configured ||
    config.webhook.configured;

  return NextResponse.json({
    status: hasAnyService ? "✅ Email service configured" : "❌ No email service configured",
    services: config,
    debug: {
      allEnvVars: emailRelatedKeys,
      totalEnvVars: allEnvKeys.length,
      smtpUserExists: !!process.env.SMTP_USER,
      smtpPassExists: !!process.env.SMTP_PASS,
      smtpUserValue: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 15)}...` : "NOT SET",
      smtpPassLength: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    },
    instructions: {
      smtp: "Use Gmail App Password: https://myaccount.google.com/apppasswords - Set SMTP_USER and SMTP_PASS",
      emailjs: "Get credentials from https://www.emailjs.com - you need Public Key, Service ID, and Template ID",
      formspree: "Get endpoint from https://formspree.io - just create a form and use the endpoint URL",
      resend: "Get API key from https://resend.com - create account and get API key",
      webhook: "Set EMAIL_WEBHOOK_URL to your custom webhook endpoint",
      note: "After adding environment variables, you MUST redeploy the application for them to take effect!",
    },
  });
}
