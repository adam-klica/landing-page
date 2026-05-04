/**
 * Script to import MongoDB database from local to Atlas
 * Usage: node scripts/import-to-atlas.js
 * 
 * Make sure to set ATLAS_URI in .env.local first!
 */

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const localUri = process.env.MONGODB_URI || "mongodb://localhost:27017/";
const localDbName = process.env.MONGODB_DB || "abgc";
const atlasUri = process.env.ATLAS_URI; // mongodb+srv://user:pass@cluster0.xxx.mongodb.net/abgc?retryWrites=true&w=majority
const atlasDbName = process.env.ATLAS_DB || "abgc";
const exportDir = path.join(__dirname, "..", "mongodb-export");

if (!atlasUri) {
  console.error("❌ ATLAS_URI is not set in .env.local");
  console.error("Add: ATLAS_URI=mongodb+srv://user:pass@cluster0.xxx.mongodb.net/abgc?retryWrites=true&w=majority");
  process.exit(1);
}

async function importToAtlas() {
  const localClient = new MongoClient(localUri);
  const atlasClient = new MongoClient(atlasUri);

  try {
    // Connect to both databases
    console.log("🔌 Connecting to local MongoDB...");
    await localClient.connect();
    console.log("✅ Connected to local MongoDB");

    console.log("🔌 Connecting to MongoDB Atlas...");
    await atlasClient.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const localDb = localClient.db(localDbName);
    const atlasDb = atlasClient.db(atlasDbName);

    // Get all collections from local database
    const collections = await localDb.listCollections().toArray();
    console.log(`\n📦 Found ${collections.length} collections to import:\n`);

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`📥 Importing "${collectionName}"...`);

      // Get all documents from local collection
      const localCollection = localDb.collection(collectionName);
      const documents = await localCollection.find({}).toArray();

      if (documents.length === 0) {
        console.log(`   ⚠️  Collection "${collectionName}" is empty, skipping...\n`);
        continue;
      }

      // Insert into Atlas collection
      const atlasCollection = atlasDb.collection(collectionName);
      
      // Clear existing documents (optional - comment out if you want to keep existing)
      const existingCount = await atlasCollection.countDocuments();
      if (existingCount > 0) {
        console.log(`   🗑️  Clearing ${existingCount} existing documents...`);
        await atlasCollection.deleteMany({});
      }

      // Insert documents
      if (documents.length > 0) {
        await atlasCollection.insertMany(documents);
        console.log(`   ✅ Imported ${documents.length} documents into "${collectionName}"`);
      }

      console.log("");
    }

    console.log("🎉 Import completed successfully!");
    console.log(`\n📋 Collections imported to Atlas:`);
    collections.forEach((col) => {
      console.log(`   - ${col.name}`);
    });
  } catch (error) {
    console.error("❌ Error importing to Atlas:", error);
    process.exit(1);
  } finally {
    await localClient.close();
    await atlasClient.close();
    console.log("\n🔌 Disconnected from databases");
  }
}

importToAtlas();
