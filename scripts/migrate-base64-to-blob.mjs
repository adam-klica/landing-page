// Migrate existing inline base64 images in users/posts/media/messages to Vercel Blob.
// Usage: node scripts/migrate-base64-to-blob.mjs [--dry-run]
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import { put } from "@vercel/blob";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const DRY = process.argv.includes("--dry-run");

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN missing");

const client = new MongoClient(process.env.MONGODB_URI, {
  socketTimeoutMS: 0,
  connectTimeoutMS: 60000,
  serverSelectionTimeoutMS: 60000,
  maxIdleTimeMS: 0,
});
await client.connect();
const db = client.db(process.env.MONGODB_DB || "abgc");

function isDataUri(v) {
  return typeof v === "string" && v.startsWith("data:");
}

function parseDataUri(uri) {
  const m = uri.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], buf: Buffer.from(m[2], "base64") };
}

function extFromMime(mime) {
  const map = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg", "application/pdf": "pdf" };
  return map[mime] || mime.split("/")[1] || "bin";
}

async function uploadDataUri(dataUri, prefix) {
  const parsed = parseDataUri(dataUri);
  if (!parsed) return null;
  const ext = extFromMime(parsed.mime);
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  if (DRY) {
    console.log(`  [dry] would upload ${parsed.buf.length} bytes -> ${path}`);
    return `https://example.invalid/${path}`;
  }
  const blob = await put(path, parsed.buf, { access: "public", contentType: parsed.mime, addRandomSuffix: true });
  return blob.url;
}

async function migrateCollection(name, fields, pathPrefix) {
  const coll = db.collection(name);
  const filter = { $or: fields.map((f) => ({ [f]: { $regex: "^data:" } })) };
  const docs = await coll
    .find(filter)
    .project({ _id: 1, ...Object.fromEntries(fields.map((f) => [f, 1])) })
    .toArray();
  let count = 0;
  let bytesSaved = 0;
  for (const doc of docs) {
    const update = {};
    for (const field of fields) {
      const val = doc[field];
      if (!isDataUri(val)) continue;
      const url = await uploadDataUri(val, `${pathPrefix}/${field}`);
      if (url) {
        update[field] = url;
        bytesSaved += val.length;
        console.log(`  ${name} ${doc._id} ${field}: ${(val.length / 1024).toFixed(0)}KB -> ${url}`);
      }
    }
    if (Object.keys(update).length && !DRY) {
      await coll.updateOne({ _id: doc._id }, { $set: update });
    }
    count++;
  }
  console.log(`${name}: migrated ${count} docs, freed ${(bytesSaved / 1024 / 1024).toFixed(2)}MB`);
}

console.log(DRY ? "DRY RUN" : "LIVE RUN");
await migrateCollection("users", ["profilePicture", "coverImage"], "users");
await migrateCollection("posts", ["featuredImage"], "posts");
await migrateCollection("media", ["url"], "media");
await migrateCollection("messages", ["fileUrl"], "messages");

await client.close();
console.log("Done.");
