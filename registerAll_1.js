import axios from "axios";

// Configuration
const DMS_TOKEN_URL = "https://info.southadriaticskills.org/api/token/";
const DMS_USERS_URL = "https://info.southadriaticskills.org/api/users/";
const DMS_ADMIN_USERNAME = "lemiclemic";
const DMS_ADMIN_PASSWORD = "automobi1";
const TIMEOUT = 60000; // 1 minute timeout

// Users to create
const users = [
  {
    username: "admin_user",
    email: "admin@example.com",
    password: "automobi1",
    first_name: "John",
    last_name: "Admin",
    is_active: true,
    groups: [1],
  },
  {
    username: "editor_user",
    email: "editor@example.com",
    password: "automobi1",
    first_name: "Jane",
    last_name: "Editor",
    is_active: true,
    groups: [2],
  },
  {
    username: "viewer_user",
    email: "viewer@example.com",
    password: "automobi1",
    first_name: "Bob",
    last_name: "Viewer",
    is_active: true,
    groups: [3],
  },
];

// Get DMS token with timeout
async function getDMSToken() {
  try {
    console.log("🔑 Getting DMS token...");
    const response = await axios.post(
      DMS_TOKEN_URL,
      {
        username: DMS_ADMIN_USERNAME,
        password: DMS_ADMIN_PASSWORD,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: TIMEOUT,
      }
    );
    console.log("✅ Token obtained successfully");
    return response.data.token;
  } catch (error) {
    console.error("❌ Failed to get DMS token:", error.response?.data || error.message);
    throw error;
  }
}

// Create a single DMS user with timeout
async function createDMSUser(userData, token) {
  try {
    console.log(`📝 Creating user: ${userData.username}...`);
    
    const response = await axios.post(
      DMS_USERS_URL,
      {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        first_name: userData.first_name,
        last_name: userData.last_name,
        is_active: userData.is_active,
        is_staff: false,
        is_superuser: false,
        groups: userData.groups || [],
        user_permissions: [
          "add_document",
          "view_document",
          "change_document",
          "delete_document",
          "add_documenttype",
          "view_documenttype",
          "change_documenttype",
          "delete_documenttype",
          "add_storagepath",
          "view_storagepath",
          "change_storagepath",
          "delete_storagepath",
          "add_savedview",
          "view_savedview",
          "change_savedview",
          "delete_savedview",
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        timeout: TIMEOUT,
      }
    );
    
    console.log(`✅ User ${userData.username} created successfully`);
    return { success: true, user: userData.username, data: response.data };
  } catch (error) {
    console.error(`❌ Failed to create user ${userData.username}:`, error.response?.data || error.message);
    return {
      success: false,
      user: userData.username,
      error: error.response?.data || error.message,
    };
  }
}

// Create all users independently (in parallel)
async function createAllUsers() {
  try {
    console.log("🚀 Starting DMS user creation process...\n");
    
    // Get token once
    const token = await getDMSToken();
    console.log("\n");
    
    // Create all users in parallel (independently)
    console.log("📦 Creating users in parallel (independent calls)...\n");
    const results = await Promise.allSettled(
      users.map((user) => createDMSUser(user, token))
    );
    
    // Process results
    console.log("\n" + "=".repeat(60));
    console.log("📊 REGISTRATION RESULTS");
    console.log("=".repeat(60));
    
    const successful = [];
    const failed = [];
    
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          successful.push(result.value);
          console.log(`✅ ${users[index].username}: SUCCESS`);
        } else {
          failed.push(result.value);
          console.log(`❌ ${users[index].username}: FAILED - ${result.value.error?.message || result.value.error}`);
        }
      } else {
        failed.push({ user: users[index].username, error: result.reason });
        console.log(`❌ ${users[index].username}: ERROR - ${result.reason.message || result.reason}`);
      }
    });
    
    console.log("\n" + "=".repeat(60));
    console.log(`✅ Successful: ${successful.length}/${users.length}`);
    console.log(`❌ Failed: ${failed.length}/${users.length}`);
    console.log("=".repeat(60));
    
    if (failed.length > 0) {
      console.log("\n⚠️  Failed registrations:");
      failed.forEach((f) => {
        console.log(`   - ${f.user}: ${JSON.stringify(f.error)}`);
      });
    }
    
    return { successful, failed };
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    throw error;
  }
}

// Run the script
createAllUsers()
  .then(() => {
    console.log("\n🎉 Process completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Process failed:", error);
    process.exit(1);
  });
