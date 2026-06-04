import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.resolve(process.cwd(), "..", "uploads");
const PUBLIC_PREFIX = "/uploads";

export async function saveUpload(file: File, subdir: string, opts?: { userId?: string }) {
  const buf = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-100);
  const rand = crypto.randomBytes(6).toString("hex");
  const ts = Date.now();
  const filename = `${ts}-${rand}-${safeName}`;

  const relDir = opts?.userId ? path.posix.join(subdir, opts.userId) : subdir;
  const absDir = path.join(UPLOAD_ROOT, relDir);
  await mkdir(absDir, { recursive: true });

  const absPath = path.join(absDir, filename);
  await writeFile(absPath, buf);

  const url = `${PUBLIC_PREFIX}/${relDir}/${filename}`.replace(/\\/g, "/");
  const pathname = `${relDir}/${filename}`.replace(/\\/g, "/");
  return { url, pathname };
}
