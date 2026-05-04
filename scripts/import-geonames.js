const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Country codes to process
const COUNTRIES = ["ME", "GB", "IT", "AL"];

async function parseCountryFile(filePath, countryCode) {
  return new Promise((resolve, reject) => {
    try {
      const stream = fs.createReadStream(filePath, { encoding: "utf8" });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      const names = new Set();

      rl.on("line", (line) => {
        if (!line || line.trim().length === 0) return;
        const parts = line.split("\t");
        // GeoNames format:
        // 0: geonameid, 1: name, 2: asciiname, 3: alternatenames, 4: lat, 5: lon,
        // 6: feature class, 7: feature code, 8: country code, ...
        try {
          const featureClass = parts[6];
          const country = parts[8];
          if (country !== countryCode) return;
          // Only populated places
          if (featureClass !== "P") return;
          const name = parts[1];
          const ascii = parts[2];
          if (name && name.length > 0) names.add(name);
          if (ascii && ascii.length > 0) names.add(ascii);
        } catch (err) {
          // ignore malformed lines
        }
      });

      rl.on("close", () => {
        resolve(Array.from(names).sort((a, b) => a.localeCompare(b)));
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function main() {
  const geonamesDir = path.join(process.cwd(), "data", "geonames");
  if (!fs.existsSync(geonamesDir)) {
    console.error("Directory not found:", geonamesDir);
    console.error("Please download the GeoNames country files and unzip them into:");
    console.error("  data/geonames/ME.txt");
    console.error("  data/geonames/GB.txt");
    console.error("  data/geonames/IT.txt");
    console.error("  data/geonames/AL.txt");
    console.error("");
    console.error("GeoNames dump files are available at: http://download.geonames.org/export/dump/");
    process.exit(1);
  }

  const output = [];
  for (const code of COUNTRIES) {
    const filePath = path.join(geonamesDir, `${code}.txt`);
    if (!fs.existsSync(filePath)) {
      console.warn(`Missing file for ${code}: ${filePath} - skipping`);
      continue;
    }
    console.log(`Parsing ${filePath} ...`);
    try {
      const cities = await parseCountryFile(filePath, code);
      output.push({
        code,
        name: code === "ME" ? "Montenegro" : code === "GB" ? "United Kingdom" : code === "IT" ? "Italy" : "Albania",
        cities,
      });
      console.log(`  -> found ${cities.length} cities for ${code}`);
    } catch (err) {
      console.error(`Failed to parse ${filePath}:`, err);
    }
  }

  if (output.length === 0) {
    console.error("No country files processed. Exiting.");
    process.exit(1);
  }

  const dest = path.join(process.cwd(), "src", "data", "locations.json");
  fs.writeFileSync(dest, JSON.stringify(output, null, 2), "utf8");
  console.log("Wrote locations to", dest);
  console.log("Done.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

