import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const country = request.nextUrl.searchParams.get("country");
    if (!country) {
      return NextResponse.json({ cities: [] });
    }

    const filePath = path.join(process.cwd(), "src", "data", "locations.json");
    const content = await readFile(filePath, "utf-8");
    const locations = JSON.parse(content);

    const found = locations.find((l: any) => l.code === country || l.name === country);
    let cities = found ? (found.cities || []) : [];

    // Filter out non-city entries heuristically (remove administrative units, villages/hamlets)
    const bannedTokens = [
      "municipality",
      "municipal",
      "county",
      "region",
      "district",
      "province",
      "village",
      "hamlet",
      "parish",
      "municipio",
      "capital",
      "capital city",
      "municipalità",
      "opština",
      "municipality",
    ];

    const isLikelyCity = (name: string) => {
      if (!name || typeof name !== "string") return false;
      const clean = name.trim();
      if (clean.length < 2) return false;
      const lower = clean.toLowerCase();
      for (const t of bannedTokens) {
        if (lower.includes(t)) return false;
      }
      // exclude entries that look like administrative area names (contain words like "city of", "county of")
      if (/city of|county of|province of|region of/.test(lower)) return false;
      return true;
    };

    cities = Array.from(new Set(cities.filter(isLikelyCity) as string[])).sort((a, b) =>
      (a as string).localeCompare(b as string)
    );

    return NextResponse.json({ cities });
  } catch (error) {
    console.error("Error loading cities:", error);
    return NextResponse.json({ cities: [] }, { status: 500 });
  }
}

