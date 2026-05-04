#!/usr/bin/env node
/**
 * Izvlači base64 slike iz ABGC Users Guide HTML-a i sačuva ih kao
 * figure-3-1.png ... figure-4-6.png u public/users-guide-images/
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC_CANDIDATES = [
  'C:/Users/User/Desktop/ABGC_Digital_Platform_Users_Guide.html',
  'C:/Users/User/Downloads/ABGC_Digital_Platform_Users_Guide.html',
];

const DEST_DIR = path.resolve('public/users-guide-images');

const ORDER = [
  'figure-3-1.png',
  'figure-3-2.png',
  'figure-3-3.png',
  'figure-3-4.png',
  'figure-4-1.png',
  'figure-4-2.png',
  'figure-4-3.png',
  'figure-4-4.png',
  'figure-4-5.png',
  'figure-4-6.png',
];

const src = SRC_CANDIDATES.find(p => fs.existsSync(p));
if (!src) {
  console.error('Ne mogu da nađem source HTML fajl.');
  process.exit(1);
}
console.log('Čitam:', src);

const html = fs.readFileSync(src, 'utf8');

// Pronađi sve data URI-jeve unutar src=" ... "
const re = /src="data:image\/([a-z]+);base64,([A-Za-z0-9+/=\s]+?)"/g;
const matches = [];
let m;
while ((m = re.exec(html)) !== null) {
  matches.push({ mime: m[1], data: m[2].replace(/\s+/g, '') });
}

console.log(`Pronađeno ${matches.length} base64 slika.`);

if (matches.length < ORDER.length) {
  console.error(`Očekivano ${ORDER.length}, a nađeno ${matches.length}. Prekidam.`);
  process.exit(2);
}

if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });

ORDER.forEach((name, i) => {
  const { mime, data } = matches[i];
  const buf = Buffer.from(data, 'base64');
  const outPath = path.join(DEST_DIR, name);
  fs.writeFileSync(outPath, buf);
  console.log(`✓ ${name}  (${(buf.length / 1024).toFixed(1)} KB, ${mime})`);
});

console.log('Gotovo.');
