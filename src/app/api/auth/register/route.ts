import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";
import { User, UserRole } from "@/models/User";

// External API URLs
const LMS_URL = "https://edu.southadriaticskills.org/api/auth/register";
const ECOMMERCE_URL = "https://market.southadriaticskills.org/api/user/register-with-role";
const DMS_TOKEN_URL = "https://info.southadriaticskills.org/api/token/";
const DMS_USERS_URL = "https://info.southadriaticskills.org/api/users/";
const DMS_ADMIN_USERNAME = "lemiclemic";
const DMS_ADMIN_PASSWORD = "automobi1";
const REQUEST_TIMEOUT = 60000; // 1 minute timeout for each request

// Map our internal roles to LMS roles
function mapToLMSRole(role: UserRole): "user" | "instructor" | "admin" {
  switch (role) {
    case "admin":
      return "admin";
    case "moderator":
    case "editor":
      return "instructor";
    case "user":
    default:
      return "user";
  }
}

// Map our internal roles to Ecommerce roles
function mapToEcommerceRole(role: UserRole): "buyer" | "seller" | "admin" {
  switch (role) {
    case "admin":
      return "admin";
    case "moderator":
    case "editor":
      return "seller";
    case "user":
    default:
      return "buyer";
  }
}

// Map our internal roles to DMS groups
// Groups: [1] = viewer, [2] = editor, [3] = admin
// For info platform use groups [2] or [3]
function mapToDMSGroups(role: UserRole, forInfo: boolean = false): number[] {
  if (forInfo) {
    // Info platform: use groups [2] or [3]
    switch (role) {
      case "admin":
        return [3];
      case "moderator":
      case "editor":
        return [2];
      case "user":
      default:
        return [2]; // Default to editor for info
    }
  } else {
    // Regular DMS: use groups [1], [2], or [3]
    switch (role) {
      case "admin":
        return [3];
      case "moderator":
      case "editor":
        return [2];
      case "user":
      default:
        return [1];
    }
  }
}

// Helper function to create a fetch with timeout
function fetchWithTimeout(url: string, options: RequestInit, timeout: number = REQUEST_TIMEOUT): Promise<Response> {
  return Promise.race([
    fetch(url, options).catch((err) => {
      console.error(`   ⚠️  Fetch error for ${url}:`, err.message);
      throw err;
    }),
    new Promise<Response>((_, reject) =>
      setTimeout(() => {
        console.error(`   ⏱️  Request timeout for ${url} after ${timeout}ms`);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout)
    ),
  ]);
}

// Helper function to sanitize username for DMS (only letters, numbers, and @/./+/-/_ characters)
function sanitizeDMSUsername(username: string): string {
  // Replace spaces with underscores
  let sanitized = username.replace(/\s+/g, "_");
  // Remove any characters that are not letters, numbers, or @/./+/-/_
  sanitized = sanitized.replace(/[^a-zA-Z0-9@.+_-]/g, "");
  // Ensure it's not empty
  if (!sanitized || sanitized.length === 0) {
    // Fallback: use email prefix if username becomes empty
    sanitized = username.split("@")[0]?.replace(/[^a-zA-Z0-9@.+_-]/g, "") || "user";
  }
  return sanitized;
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(80));
  console.log("🚀 REGISTRATION REQUEST STARTED");
  console.log("=".repeat(80));
  
  // Declare variables outside try block so they're accessible in catch
  let registrationResults: any = {
    lms: null,
    ecommerce: null,
    dms: null,
  };
  let lmsUserId: string | null = null;
  let result: any = null;
  
  try {
    const body = await request.json();
    
    // Debug logging
    console.log("📥 Received registration request:", {
      timestamp: new Date().toISOString(),
      hasUsername: !!body.username,
      hasUserName: !!body.userName,
      hasEmail: !!body.email,
      hasUserEmail: !!body.userEmail,
      hasPassword: !!body.password,
      selectedPlatforms: body.selectedPlatforms || "not provided (will default to all)",
      displayName: body.displayName || "not provided",
      organization: body.organization || "not provided",
    });
    
    // Support both userName/userEmail (for external API calls) and username/email
    const username = body.username || body.userName;
    const email = body.email || body.userEmail;
    const { password, displayName, organization, location, role_custom, interests, selectedPlatforms, role: requestedRole, platformRoles } = body;
    
    // Determine which platforms to register on (default to all if not specified)
    const platforms = selectedPlatforms && Array.isArray(selectedPlatforms) && selectedPlatforms.length > 0
      ? selectedPlatforms
      : ["lms", "ecommerce", "dms"]; // Default to all platforms
    
    console.log("🎯 Selected platforms:", platforms);
    console.log("📋 Platforms breakdown:", {
      lms: platforms.includes("lms") ? "✅ WILL REGISTER" : "⏭️ SKIP",
      ecommerce: platforms.includes("ecommerce") ? "✅ WILL REGISTER" : "⏭️ SKIP",
      dms: platforms.includes("dms") ? "✅ WILL REGISTER" : "⏭️ SKIP",
    });

    // Validate required fields
    // Validate password: minimum 8 characters, at least one letter and one number
    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters long" },
          { status: 400 }
        );
      }
      if (!/[a-zA-Z]/.test(password)) {
        return NextResponse.json(
          { error: "Password must contain at least one letter" },
          { status: 400 }
        );
      }
      if (!/[0-9]/.test(password)) {
        return NextResponse.json(
          { error: "Password must contain at least one number" },
          { status: 400 }
        );
      }
    }

    if (!username || !email || !password) {
      console.error("❌ VALIDATION FAILED: Missing required fields", {
        username: !!username,
        email: !!email,
        password: !!password,
        bodyKeys: Object.keys(body)
      });
      const errorResponse = NextResponse.json(
        { 
          error: "Missing required fields: username, email, password",
          received: {
            username: !!username,
            email: !!email,
            password: !!password,
            bodyKeys: Object.keys(body)
          }
        },
        { status: 400 }
      );
      errorResponse.headers.set("Access-Control-Allow-Origin", "*");
      return errorResponse;
    }
    
    console.log("✅ Validation passed:", { username, email: email.substring(0, 10) + "..." });

    const collection = await getCollection("users");

    // Check if username or email already exists
    const existing = await collection.findOne({
      $or: [{ username }, { email }],
    });

    if (existing) {
      console.error("❌ USER ALREADY EXISTS:", { username, email: email.substring(0, 10) + "..." });
      const errorResponse = NextResponse.json(
        { error: "Username or email already exists" },
        { status: 400 }
      );
      errorResponse.headers.set("Access-Control-Allow-Origin", "*");
      return errorResponse;
    }
    
    console.log("✅ User does not exist, proceeding with registration");

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine user role:
    // - Admin role CANNOT be selected during registration (security)
    // - If role is provided in request, use it (but validate it's not admin)
    // - Otherwise, if there is no admin in DB, make this user admin
    // - Otherwise, default to "user"
    const validRoles: UserRole[] = ["admin", "moderator", "editor", "user"];
    const adminExists = (await collection.countDocuments({ role: "admin" })) > 0;
    
    let role: UserRole;
    if (requestedRole && validRoles.includes(requestedRole as UserRole)) {
      // Prevent admin role from being set via registration form
      if (requestedRole === "admin") {
        console.warn("⚠️  Admin role cannot be set via registration - defaulting to user");
        role = "user";
      } else {
        // Use requested role if valid and not admin
        role = requestedRole as UserRole;
        console.log(`✅ Using requested role: ${role}`);
      }
    } else if (!adminExists) {
      // First user becomes admin if no admin exists (only automatic, not via form)
      role = "admin";
      console.log("✅ First user - automatically set as admin");
    } else {
      // Default to user
      role = "user";
      console.log("✅ Default role: user");
    }

    const now = new Date();
    const user: Omit<User, "_id"> = {
      username,
      email,
      password: hashedPassword,
      role,
      displayName: displayName || username,
      organization,
      location,
      country: body.country || undefined,
      city: body.city || undefined,
      region: body.region || undefined,
      role_custom,
      interests,
      createdAt: now,
      updatedAt: now,
    };

    // Registration results from all systems (already declared above)
    registrationResults = {
      lms: null,
      ecommerce: null,
      dms: null,
    };

    let lmsSuccess = false;
    let ecommerceSuccess = false;
    let dmsSuccess = false;
    let lmsError: string | null = null;
    let ecommerceError: string | null = null;
    let dmsError: string | null = null;

    // Always create user locally first (for authentication in our app)
    try {
      console.log("💾 Creating user in local database (MongoDB)...");
      result = await collection.insertOne(user);
      lmsUserId = result.insertedId.toString();
      console.log("✅ Local user created successfully:", { userId: lmsUserId, username, role });
    } catch (localErr: any) {
      console.error("❌ FAILED to create user locally:", localErr.message);
      const errorResponse = NextResponse.json(
        { error: `Failed to create user locally: ${localErr.message}` },
        { status: 500 }
      );
      errorResponse.headers.set("Access-Control-Allow-Origin", "*");
      return errorResponse;
    }

    // Helper function for LMS registration (independent call)
    const registerLMS = async () => {
      if (!platforms.includes("lms")) {
        lmsSuccess = true;
        registrationResults.lms = {
          success: true,
          userId: lmsUserId,
          note: "Created locally only (not registered on external LMS)",
        };
        console.log("   ⏭️  LMS registration SKIPPED (not selected)");
        return;
      }

      console.log("\n📚 Starting LMS registration (independent call)...");
      console.log("   URL:", LMS_URL);
      // Use platform-specific role if provided, otherwise map from global role
      const lmsRole = platformRoles?.lms || mapToLMSRole(role);
      console.log(`   Role: ${lmsRole} (LMS) - ${platformRoles?.lms ? "from platformRoles" : "mapped from global role"}`);
      try {
        const lmsResponse = await fetchWithTimeout(
          LMS_URL,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userName: username,
              userEmail: email,
              password: password,
              role: lmsRole,
            }),
          },
          REQUEST_TIMEOUT
        );

        console.log("   Response status:", lmsResponse.status, lmsResponse.statusText);

        if (lmsResponse.ok) {
          const lmsData = await lmsResponse.json();
          lmsSuccess = true;
          registrationResults.lms = {
            success: true,
            userId: lmsUserId,
            data: lmsData,
          };
          console.log("   ✅ LMS registration SUCCESS:", { userId: lmsUserId });
        } else {
          try {
            const errorData = await lmsResponse.json();
            lmsError = errorData.message || errorData.error || JSON.stringify(errorData);
          } catch {
            lmsError = await lmsResponse.text();
          }
          registrationResults.lms = {
            success: false,
            error: lmsError,
            status: lmsResponse.status,
          };
          console.error("   ❌ LMS registration FAILED:", { status: lmsResponse.status, error: lmsError });
        }
      } catch (lmsErr: any) {
        lmsError = lmsErr.message;
        registrationResults.lms = {
          success: false,
          error: lmsError,
        };
        console.error("   ❌ LMS registration ERROR:", lmsErr.message);
      }
    };

    // Helper function for ECOMMERCE registration (independent call)
    const registerEcommerce = async () => {
      if (!platforms.includes("ecommerce")) {
        ecommerceSuccess = true;
        registrationResults.ecommerce = { success: true, message: "Skipped by user" };
        console.log("   ⏭️  ECOMMERCE registration SKIPPED (not selected)");
        return;
      }

      console.log("\n🛒 Starting ECOMMERCE registration (independent call)...");
      console.log("   URL:", ECOMMERCE_URL);
      // Use platform-specific role if provided, otherwise map from global role
      const ecommerceRole = platformRoles?.ecommerce || mapToEcommerceRole(role);
      console.log(`   Role: ${ecommerceRole} (Ecommerce) - ${platformRoles?.ecommerce ? "from platformRoles" : "mapped from global role"}`);
      try {
        const ecommerceResponse = await fetchWithTimeout(
          ECOMMERCE_URL,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: displayName || username,
              email: email,
              password: password,
              role: ecommerceRole,
            }),
          },
          REQUEST_TIMEOUT
        );

        console.log("   Response status:", ecommerceResponse.status, ecommerceResponse.statusText);

        if (ecommerceResponse.ok) {
          const ecommerceData = await ecommerceResponse.json();
          ecommerceSuccess = true;
          registrationResults.ecommerce = {
            success: true,
            data: ecommerceData,
          };
          console.log("   ✅ ECOMMERCE registration SUCCESS");
        } else {
          try {
            const errorData = await ecommerceResponse.json();
            ecommerceError = errorData.message || errorData.error || JSON.stringify(errorData);
          } catch {
            ecommerceError = await ecommerceResponse.text();
          }
          registrationResults.ecommerce = {
            success: false,
            error: ecommerceError,
            status: ecommerceResponse.status,
          };
          console.error("   ❌ ECOMMERCE registration FAILED:", { status: ecommerceResponse.status, error: ecommerceError });
        }
      } catch (ecommerceErr: any) {
        ecommerceError = ecommerceErr.message;
        registrationResults.ecommerce = {
          success: false,
          error: ecommerceError,
        };
        console.error("   ❌ ECOMMERCE registration ERROR:", ecommerceErr.message);
      }
    };

    // Helper function for DMS registration (independent call)
    const registerDMS = async () => {
      if (!platforms.includes("dms")) {
        dmsSuccess = true;
        registrationResults.dms = { success: true, message: "Skipped by user" };
        console.log("   ⏭️  DMS registration SKIPPED (not selected)");
        return;
      }

      console.log("\n📁 Starting DMS registration (independent call)...");
      console.log("   Token URL:", DMS_TOKEN_URL);
      try {
        // First, get DMS token
        console.log("   Step 1: Getting DMS token...");
        const tokenResponse = await fetchWithTimeout(
          DMS_TOKEN_URL,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: DMS_ADMIN_USERNAME,
              password: DMS_ADMIN_PASSWORD,
            }),
          },
          REQUEST_TIMEOUT
        );

        console.log("   Token response status:", tokenResponse.status, tokenResponse.statusText);

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          const TOKEN = tokenData.token;
          console.log("   ✅ DMS token obtained successfully");

          // Split displayName into first_name and last_name
          const nameParts = (displayName || username).split(" ");
          const first_name = nameParts[0] || username;
          const last_name = nameParts.slice(1).join(" ") || username;

          // Sanitize username for DMS (only letters, numbers, and @/./+/-/_ characters)
          const dmsUsername = sanitizeDMSUsername(username);
          if (dmsUsername !== username) {
            console.log(`   ⚠️  Username sanitized for DMS: "${username}" -> "${dmsUsername}"`);
          }

          // Now, create DMS user
          console.log("   Step 2: Creating DMS user...");
          console.log("   Users URL:", DMS_USERS_URL);
          // Use platform-specific groups if provided, otherwise map from global role
          let dmsGroups: number[];
          if (platformRoles?.dms) {
            dmsGroups = [parseInt(platformRoles.dms)];
            console.log(`   Groups: ${JSON.stringify(dmsGroups)} (DMS) - from platformRoles`);
          } else {
            dmsGroups = mapToDMSGroups(role, false);
            console.log(`   Groups: ${JSON.stringify(dmsGroups)} (DMS) - mapped from global role`);
          }
          
          const dmsResponse = await fetchWithTimeout(
            DMS_USERS_URL,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Token ${TOKEN}`,
              },
              body: JSON.stringify({
                username: dmsUsername,
                email: email,
                password: password,
                first_name: first_name,
                last_name: last_name,
                is_active: true,
                groups: dmsGroups, // DMS groups: [1]=viewer, [2]=editor, [3]=admin
              }),
            },
            REQUEST_TIMEOUT
          );

          console.log("   Response status:", dmsResponse.status, dmsResponse.statusText);

          if (dmsResponse.ok) {
            const dmsData = await dmsResponse.json();
            dmsSuccess = true;
            registrationResults.dms = {
              success: true,
              data: dmsData,
            };
            console.log("   ✅ DMS registration SUCCESS");
          } else {
            try {
              const errorData = await dmsResponse.json();
              dmsError = errorData.message || errorData.error || JSON.stringify(errorData);
            } catch {
              dmsError = await dmsResponse.text();
            }
            registrationResults.dms = {
              success: false,
              error: dmsError,
              status: dmsResponse.status,
            };
            console.error("   ❌ DMS registration FAILED:", { status: dmsResponse.status, error: dmsError });
          }
        } else {
          dmsError = "Failed to get DMS token";
          registrationResults.dms = {
            success: false,
            error: dmsError,
          };
          console.error("   ❌ DMS token request FAILED:", { status: tokenResponse.status });
        }
      } catch (dmsErr: any) {
        dmsError = dmsErr.message;
        registrationResults.dms = {
          success: false,
          error: dmsError,
        };
        console.error("   ❌ DMS registration ERROR:", dmsErr.message);
      }
    };

    // Execute all registrations in parallel (independently)
    console.log("\n🚀 Starting parallel registrations (independent calls)...");
    console.log("📊 Registration plan:", {
      lms: platforms.includes("lms") ? "✅ WILL CREATE USER" : "⏭️ SKIP",
      ecommerce: platforms.includes("ecommerce") ? "✅ WILL CREATE USER" : "⏭️ SKIP",
      dms: platforms.includes("dms") ? "✅ WILL CREATE USER" : "⏭️ SKIP",
    });
    
    try {
      const registrationPromises = [];
      if (platforms.includes("lms")) {
        console.log("   📝 Adding LMS registration to queue...");
        registrationPromises.push(
          registerLMS().catch((err) => {
            console.error("   ❌ LMS registration promise rejected:", err.message);
            throw err;
          })
        );
      }
      if (platforms.includes("ecommerce")) {
        console.log("   📝 Adding ECOMMERCE registration to queue...");
        registrationPromises.push(
          registerEcommerce().catch((err) => {
            console.error("   ❌ ECOMMERCE registration promise rejected:", err.message);
            throw err;
          })
        );
      }
      if (platforms.includes("dms")) {
        console.log("   📝 Adding DMS registration to queue...");
        registrationPromises.push(
          registerDMS().catch((err) => {
            console.error("   ❌ DMS registration promise rejected:", err.message);
            throw err;
          })
        );
      }
      
      console.log(`   📦 Executing ${registrationPromises.length} registration(s) in parallel...`);
      const results = await Promise.allSettled(registrationPromises);
      
      console.log("\n✅ All registration calls completed (independent execution)");
      console.log("📊 Promise.allSettled results:", results.map((r, i) => ({
        index: i,
        status: r.status,
        value: r.status === "fulfilled" ? "fulfilled" : r.reason?.message || "unknown error"
      })));
      console.log("📊 Final registration status:", {
        lms: lmsSuccess ? "✅ CREATED" : `❌ FAILED: ${lmsError || "Unknown error"}`,
        ecommerce: ecommerceSuccess ? "✅ CREATED" : `❌ FAILED: ${ecommerceError || "Unknown error"}`,
        dms: dmsSuccess ? "✅ CREATED" : `❌ FAILED: ${dmsError || "Unknown error"}`,
      });
      console.log("📊 Registration results object:", JSON.stringify(registrationResults, null, 2));
    } catch (registrationErr: any) {
      console.error("❌ Error during parallel registration execution:", registrationErr.message);
      console.error("Stack:", registrationErr.stack);
      // Don't throw here - let the code continue to check results
    }

    // -------- CHECK REGISTRATION RESULTS --------
    // Count successful registrations
    console.log("\n🔍 Checking registration results...");
    console.log("   LMS:", lmsSuccess ? "✅" : "❌", platforms.includes("lms") ? "(required)" : "(skipped)");
    console.log("   ECOMMERCE:", ecommerceSuccess ? "✅" : "❌", platforms.includes("ecommerce") ? "(required)" : "(skipped)");
    console.log("   DMS:", dmsSuccess ? "✅" : "❌", platforms.includes("dms") ? "(required)" : "(skipped)");
    console.log("   Registration results object keys:", Object.keys(registrationResults));
    console.log("   Registration results values:", {
      lms: registrationResults.lms ? (registrationResults.lms.success ? "✅ success" : "❌ failed") : "null",
      ecommerce: registrationResults.ecommerce ? (registrationResults.ecommerce.success ? "✅ success" : "❌ failed") : "null",
      dms: registrationResults.dms ? (registrationResults.dms.success ? "✅ success" : "❌ failed") : "null",
    });
    
    const selectedPlatformsCount = platforms.length;
    const successfulRegistrations = [
      platforms.includes("lms") && lmsSuccess,
      platforms.includes("ecommerce") && ecommerceSuccess,
      platforms.includes("dms") && dmsSuccess,
    ].filter(Boolean).length;
    
    const allSelectedSucceeded = 
      (platforms.includes("lms") ? lmsSuccess : true) &&
      (platforms.includes("ecommerce") ? ecommerceSuccess : true) &&
      (platforms.includes("dms") ? dmsSuccess : true);

    // Build warnings/errors for failed registrations
    const warnings: string[] = [];
    if (platforms.includes("lms") && !lmsSuccess) {
      warnings.push(`LMS: ${lmsError || "Registration failed"}`);
    }
    if (platforms.includes("ecommerce") && !ecommerceSuccess) {
      warnings.push(`ECOMMERCE: ${ecommerceError || "Registration failed"}`);
    }
    if (platforms.includes("dms") && !dmsSuccess) {
      warnings.push(`DMS: ${dmsError || "Registration failed"}`);
    }

    // If at least one registration succeeded OR local user was created, proceed
    // Only rollback if ALL registrations failed AND user was created locally
    if (!allSelectedSucceeded) {
      if (successfulRegistrations === 0 && lmsUserId) {
        // All registrations failed - rollback
        console.error("\n❌ ROLLBACK REQUIRED: All registrations failed");
        try {
          await collection.deleteOne({ _id: result.insertedId });
          console.log("   ✅ User rolled back (deleted from local database)");
        } catch (rollbackErr) {
          console.error("   ❌ Failed to rollback user:", rollbackErr);
        }
        
        console.error("   Error details:", warnings);
        const errorResponse = NextResponse.json(
          {
            error: "Registration failed in all selected systems",
            details: warnings,
            registrations: registrationResults,
          },
          { status: 500 }
        );
        errorResponse.headers.set("Access-Control-Allow-Origin", "*");
        return errorResponse;
      } else {
        // Some registrations succeeded - continue but log warnings
        console.warn("\n⚠️  PARTIAL SUCCESS: Some registrations failed");
        console.warn("   Successful:", successfulRegistrations, "out of", selectedPlatformsCount);
        console.warn("   Warnings:", warnings);
      }
    } else {
      console.log("✅ All selected registrations succeeded!");
    }

    // Update user with registered platforms information
    try {
      console.log("\n💾 Updating user with platform registration info...");
      await collection.updateOne(
        { _id: result.insertedId },
        {
          $set: {
            registeredPlatforms: {
              lms: lmsSuccess,
              ecommerce: ecommerceSuccess,
              dms: dmsSuccess,
            },
          },
        }
      );
      console.log("✅ User updated with platform info");
    } catch (updateErr: any) {
      console.error("⚠️  Failed to update user with platform info:", updateErr.message);
      // Don't fail the registration if this update fails
    }

    // Create token for LMS
    console.log("\n🔐 Creating authentication token...");
    const token = createToken({
      userId: lmsUserId!,
      username: user.username,
      role: user.role,
    });

    // Send welcome email to user
    console.log("\n📧 Sending welcome email...");
    try {
      const { sendEmail } = await import("@/lib/email");
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://southadriaticskills.org";
      
      const emailSubject = `Welcome to ABGC - Registration Successful`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #B53251; margin: 0; font-size: 28px;">Welcome to Adriatic Blue Growth Cluster!</h1>
          </div>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear ${displayName || username},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Thank you for registering with the Adriatic Blue Growth Cluster (ABGC) platform!</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Your registration has been successfully completed. You can now access all the features and services available on our platform.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #E23F65;">
            <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #333;">Username:</strong> <span style="color: #666;">${username}</span></p>
            <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #333;">Email:</strong> <span style="color: #666;">${email}</span></p>
            <p style="margin: 15px 0 8px 0; font-size: 15px;"><strong style="color: #333;">Registered Platforms:</strong></p>
            <ul style="margin: 8px 0; padding-left: 25px; color: #666;">
              ${platforms.includes("lms") && lmsSuccess ? "<li style='margin: 5px 0;'>✅ Learning Management System (LMS)</li>" : ""}
              ${platforms.includes("ecommerce") && ecommerceSuccess ? "<li style='margin: 5px 0;'>✅ E-Commerce Platform</li>" : ""}
              ${platforms.includes("dms") && dmsSuccess ? "<li style='margin: 5px 0;'>✅ Document Management System (DMS)</li>" : ""}
            </ul>
          </div>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">You can now log in to your account and start exploring the platform:</p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="${baseUrl}/en/login" style="background-color: #E23F65; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: 600; font-size: 16px;">Log In to Your Account</a>
          </div>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">If you have any questions or need assistance, please don't hesitate to contact us.</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 25px;">Best regards,<br><strong style="color: #B53251;">The ABGC Team</strong></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 35px 0;">
          <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 0;">
            This is an automated email. Please do not reply to this message.<br>
            For support, contact us at: <a href="mailto:info@southadriaticskills.org" style="color: #E23F65;">info@southadriaticskills.org</a>
          </p>
        </div>
      `;

      const emailResult = await sendEmail({
        to: email,
        subject: emailSubject,
        html: emailBody,
        from: "ABGC <onboarding@resend.dev>",
      });

      if (emailResult.success) {
        console.log("✅ Welcome email sent successfully to:", email);
      } else {
        console.error("❌ Failed to send welcome email:", emailResult.error);
      }
    } catch (emailError: any) {
      console.error("❌ Error sending welcome email:", emailError.message);
      // Don't fail registration if email fails
    }

    // Set cookie
    const response = NextResponse.json({
      user: {
        _id: lmsUserId!,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
      registrations: registrationResults,
      ...(warnings.length > 0 && { warnings, partialSuccess: true }),
    });

    // Add CORS headers for external API calls
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    const duration = Date.now() - startTime;
    console.log("\n" + "=".repeat(80));
    console.log("✅ REGISTRATION COMPLETED SUCCESSFULLY");
    console.log("=".repeat(80));
    console.log("⏱️  Total duration:", duration + "ms");
    console.log("👤 User:", { username, email: email.substring(0, 10) + "...", userId: lmsUserId });
    console.log("📊 Final results:", {
      lms: registrationResults.lms?.success ? "✅" : "❌",
      ecommerce: registrationResults.ecommerce?.success ? "✅" : "❌",
      dms: registrationResults.dms?.success ? "✅" : "❌",
    });
    console.log("=".repeat(80) + "\n");

    return response;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("\n" + "=".repeat(80));
    console.error("❌ REGISTRATION FAILED (General Error)");
    console.error("=".repeat(80));
    console.error("⏱️  Duration:", duration + "ms");
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("Registration results so far:", registrationResults);
    console.error("=".repeat(80) + "\n");
    
    // If user was created locally, try to rollback
    if (lmsUserId && result) {
      try {
        const collection = await getCollection("users");
        await collection.deleteOne({ _id: result.insertedId });
        console.log("   ✅ User rolled back (deleted from local database)");
      } catch (rollbackErr) {
        console.error("   ❌ Failed to rollback user:", rollbackErr);
      }
    }
    
    const errorResponse = NextResponse.json(
      { 
        error: error.message || "Registration failed",
        details: error.stack,
        registrations: registrationResults,
      },
      { status: 500 }
    );
    errorResponse.headers.set("Access-Control-Allow-Origin", "*");
    return errorResponse;
  }
}
