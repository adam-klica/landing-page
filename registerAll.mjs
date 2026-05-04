import axios from "axios";
import https from "https";

// Configuration
// LOCAL TESTING - koristi lokalni server
const LMS_URL = "http://localhost:3000/api/auth/register";
// PRODUCTION - koristi eksterni server (kad budeš spreman)
// const LMS_URL = "http://89.188.43.147/api/auth/register";

const ECOMMERCE_URL = "http://89.188.43.149/api/user/register-with-role";
const DMS_URL = "http://89.188.43.148";
const DMS_ADMIN_USERNAME = "lemiclemic";
const DMS_ADMIN_PASSWORD = "automobi1";

// Create axios instance that ignores SSL certificate errors (for development/testing)
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Ignore SSL certificate errors
  })
});

/**
 * Register a user on the LMS system
 * @param {Object} userData - User data object
 * @param {string} userData.username - Username (required)
 * @param {string} userData.email - Email (required)
 * @param {string} userData.password - Password (required)
 * @param {string} [userData.displayName] - Display name (optional)
 * @param {string} [userData.organization] - Organization (optional)
 * @param {string} [userData.location] - Location (optional)
 * @param {string} [userData.role_custom] - Custom role (optional)
 * @param {string} [userData.interests] - Interests (optional)
 * @returns {Promise<Object>} Response data from API
 */
export async function registerLMSUser(userData) {
  try {
    const response = await axiosInstance.post(
      LMS_URL,
      {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName || userData.username,
        organization: userData.organization,
        location: userData.location,
        role_custom: userData.role_custom,
        interests: userData.interests
      },
      { headers: { "Content-Type": "application/json" } }
    );
    console.log(`✅ LMS Registration (${userData.username}):`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ LMS Registration failed (${userData.username}):`, error.response?.data || error.message);
    throw error;
  }
}

async function registerAllUsers() {
  try {
    console.log("🚀 Počinjem registraciju...\n");
    
    // -------- LMS Registration --------
    console.log("📝 Korak 1: Registrujem korisnika na LMS sistemu...");
    const lmsResponse = await registerLMSUser({
      username: "testuser_" + Date.now(), // Jedinstveno ime za svaki test
      email: `test${Date.now()}@example.com`, // Jedinstveni email
      password: "Test123!",
      displayName: "Test User"
    });

    // -------- ECOMMERCE Registration --------
    console.log("\n📝 Korak 2: Registrujem korisnika na ECOMMERCE sistemu...");
    const ecommerceResponse = await axiosInstance.post(
      "http://89.188.43.149/api/user/register-with-role",
      {
        name: "Adam Klica",
        email: "lemi.klic1a112@2gmail.com",
        password: "asdasdasd",
        role: "buyer"
      },
      { headers: { "Content-Type": "application/json" } }
    );
    console.log("✅ Ecommerce Registration:", ecommerceResponse.data);

    // -------- DMS Registration --------
    console.log("\n📝 Korak 3: Registrujem korisnika na DMS sistemu...");
    console.log("   → Prvo dobijam token...");
    // First, get token
    const tokenResponse = await axiosInstance.post(
      `${DMS_URL}/api/token/`,
      {
        username: DMS_ADMIN_USERNAME,
        password: DMS_ADMIN_PASSWORD
      },
      { headers: { "Content-Type": "application/json" } }
    );
    const TOKEN = tokenResponse.data.token;
    console.log("   ✅ Token dobijen!");

    // Now, create DMS user
    console.log("   → Sada kreiram korisnika...");
    const dmsResponse = await axiosInstance.post(
      `${DMS_URL}/api/users/`,
      {
        username: "lemiclemic6",
        email: "test5@example.com",
        password: "automobi1",
        first_name: "adam",
        last_name: "klica",
        is_active: true,
        is_staff: false,
        is_superuser: false,
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
          "delete_savedview"
        ]
      },
      {
        headers: { "Content-Type": "application/json", Authorization: `Token ${TOKEN}` }
      }
    );
    console.log("✅ DMS Registration:", dmsResponse.data);

    console.log("\n🎉 All registrations completed successfully!");
  } catch (error) {
    console.error("❌ Error during registration:", error.response?.data || error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
  }
}

// Export function for use in other modules
export { registerAllUsers };

// Run the registration
registerAllUsers();
