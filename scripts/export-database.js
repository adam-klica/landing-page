/**
 * Script to export MongoDB database to JSON files
 * Usage: node scripts/export-database.js
 */

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/";
const dbName = process.env.MONGODB_DB || "abgc";
const outputDir = path.join(__dirname, "..", "mongodb-export");

async function exportDatabase() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`\n📦 Exporting database: ${dbName}`);
    console.log(`📁 Output directory: ${outputDir}\n`);

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();

      const outputFile = path.join(outputDir, `${collectionName}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(documents, null, 2));

      console.log(`✅ Exported ${documents.length} documents from "${collectionName}"`);
    }

    console.log(`\n🎉 Export completed! Files saved in: ${outputDir}`);
    console.log(`\n📋 Collections exported:`);
    collections.forEach((col) => {
      console.log(`   - ${col.name}`);
    });
  } catch (error) {
    console.error("❌ Error exporting database:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

exportDatabase();
