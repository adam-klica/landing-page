import axios from "axios";

// Test configuration
const API_URL = "http://localhost:3000/api/auth/register"; // Change to production URL if needed
const TEST_USER = {
  username: `testuser_${Date.now()}`,
  email: `test${Date.now()}@example.com`,
  password: "Test123!",
  displayName: "Test User",
  organization: "Test Organization",
  location: "Beograd, Centralna Srbija, Serbia",
  role_custom: "Student",
  interests: "Testing",
};

// Test scenarios
const testScenarios = [
  {
    name: "Test 1: Registracija na sve tri platforme",
    payload: {
      ...TEST_USER,
      selectedPlatforms: ["lms", "ecommerce", "dms"],
    },
  },
  {
    name: "Test 2: Registracija samo na LMS",
    payload: {
      ...TEST_USER,
      username: `testuser_lms_${Date.now()}`,
      email: `testlms${Date.now()}@example.com`,
      selectedPlatforms: ["lms"],
    },
  },
  {
    name: "Test 3: Registracija samo na Ecommerce",
    payload: {
      ...TEST_USER,
      username: `testuser_ecom_${Date.now()}`,
      email: `testecom${Date.now()}@example.com`,
      selectedPlatforms: ["ecommerce"],
    },
  },
  {
    name: "Test 4: Registracija samo na DMS",
    payload: {
      ...TEST_USER,
      username: `testuser_dms_${Date.now()}`,
      email: `testdms${Date.now()}@example.com`,
      selectedPlatforms: ["dms"],
    },
  },
  {
    name: "Test 5: Registracija na LMS i Ecommerce",
    payload: {
      ...TEST_USER,
      username: `testuser_lms_ecom_${Date.now()}`,
      email: `testlmsecom${Date.now()}@example.com`,
      selectedPlatforms: ["lms", "ecommerce"],
    },
  },
];

async function testRegistration(scenario) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧪 ${scenario.name}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`📤 Payload:`, JSON.stringify(scenario.payload, null, 2));

  try {
    const response = await axios.post(API_URL, scenario.payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log(`\n✅ Status: ${response.status}`);
    console.log(`📥 Response:`, JSON.stringify(response.data, null, 2));

    // Check registration results
    if (response.data.registrations) {
      console.log(`\n📊 Registration Results:`);
      if (response.data.registrations.lms) {
        console.log(
          `   LMS: ${response.data.registrations.lms.success ? "✅" : "❌"} ${
            response.data.registrations.lms.success
              ? response.data.registrations.lms.userId || "Success"
              : response.data.registrations.lms.error
          }`
        );
      }
      if (response.data.registrations.ecommerce) {
        console.log(
          `   Ecommerce: ${response.data.registrations.ecommerce.success ? "✅" : "❌"} ${
            response.data.registrations.ecommerce.success
              ? "Success"
              : response.data.registrations.ecommerce.error
          }`
        );
      }
      if (response.data.registrations.dms) {
        console.log(
          `   DMS: ${response.data.registrations.dms.success ? "✅" : "❌"} ${
            response.data.registrations.dms.success
              ? "Success"
              : response.data.registrations.dms.error
          }`
        );
      }
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error.response?.status || "Network Error"}`);
    if (error.response?.data) {
      console.log(`📥 Error Response:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`📥 Error Message:`, error.message);
    }
  }
}

async function runAllTests() {
  console.log(`\n🚀 Starting Registration API Tests`);
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}\n`);

  for (const scenario of testScenarios) {
    await testRegistration(scenario);
    // Wait 2 seconds between tests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ All tests completed!`);
  console.log(`${"=".repeat(60)}\n`);
}

// Run tests
runAllTests().catch(console.error);
