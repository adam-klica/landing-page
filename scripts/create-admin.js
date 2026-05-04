const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/";
const dbName = process.env.MONGODB_DB || "abgc";

async function createAdmin() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection("users");

    // Check if admin already exists and delete it
    const existingAdmin = await collection.findOne({ username: "admin" });
    if (existingAdmin) {
      console.log("⚠️  Admin user already exists. Deleting and recreating...");
      await collection.deleteOne({ username: "admin" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("admin", 10);

    const now = new Date();
    const adminUser = {
      username: "admin",
      email: "admin@abgc.local",
      password: hashedPassword,
      role: "admin",
      displayName: "Administrator",
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(adminUser);

    console.log("✅ Admin user created successfully!");
    console.log("Username: admin");
    console.log("Password: admin");
    console.log("User ID:", result.insertedId.toString());
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    await client.close();
  }
}

createAdmin();
