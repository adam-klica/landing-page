import "dotenv/config";
import { MongoClient } from "mongodb";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOAD_ROOT = path.resolve(process.cwd(), "..", "uploads");
const PUBLIC_PREFIX = "/uploads";

async function downloadAndSave(url, subdir) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const orig = path.basename(new URL(url).pathname);
  const safe = orig.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-100);
  const rand = crypto.randomBytes(6).toString("hex");
  const filename = `${Date.now()}-${rand}-${safe}`;
  const absDir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(absDir, { recursive: true });
  await writeFile(path.join(absDir, filename), buf);
  return {
    url: `${PUBLIC_PREFIX}/${subdir}/${filename}`,
    pathname: `${subdir}/${filename}`,
  };
}

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB);

let okM = 0, failM = 0;
const mediaDocs = await db.collection("media").find({ url: { $regex: "vercel-storage" } }).toArray();
console.log(`media to migrate: ${mediaDocs.length}`);
for (const d of mediaDocs) {
  try {
    const saved = await downloadAndSave(d.url, "media/migrated");
    await db.collection("media").updateOne(
      { _id: d._id },
      { $set: { url: saved.url, filename: saved.pathname, _origVercelUrl: d.url } }
    );
    okM++;
    console.log(`OK media ${d._id} -> ${saved.url}`);
  } catch (e) {
    failM++;
    console.log(`FAIL media ${d._id}: ${e.message}`);
  }
}

let okMsg = 0, failMsg = 0;
const msgs = await db.collection("messages").find({ fileUrl: { $regex: "vercel-storage" } }).toArray();
console.log(`messages to migrate: ${msgs.length}`);
for (const d of msgs) {
  try {
    const saved = await downloadAndSave(d.fileUrl, "messages/migrated");
    await db.collection("messages").updateOne(
      { _id: d._id },
      { $set: { fileUrl: saved.url, _origVercelUrl: d.fileUrl } }
    );
    okMsg++;
    console.log(`OK msg ${d._id} -> ${saved.url}`);
  } catch (e) {
    failMsg++;
    console.log(`FAIL msg ${d._id}: ${e.message}`);
  }
}

console.log(`\nmedia: ${okM} ok / ${failM} fail`);
console.log(`messages: ${okMsg} ok / ${failMsg} fail`);

await client.close();
