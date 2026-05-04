import { NextRequest, NextResponse } from "next/server";

// Proxy endpoint to fetch city suggestions from Nominatim (OpenStreetMap)
// Query params:
// - q: partial city name
// - country: country code (ME, GB, IT, AL)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || "";
    const country = (searchParams.get("country") || "").toLowerCase();

    if (!q || q.trim().length < 1) {
      return NextResponse.json({ cities: [] });
    }

    // Build Nominatim URL
    const params = new URLSearchParams({
      format: "json",
      city: q,
      limit: "15",
      addressdetails: "1",
    });
    if (country) {
      params.set("countrycodes", country);
    }

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        // polite user agent per Nominatim policy
        "User-Agent": "cluster-app/1.0 (+https://your-domain.example)",
        "Accept-Language": "en",
      },
    });

    if (!res.ok) {
      console.error("Nominatim error:", res.status, await res.text());
      return NextResponse.json({ cities: [] }, { status: 502 });
    }

    const data = await res.json();

    // Collect possible city names from address fields (prefer city and town only)
    const citySet = new Set<string>();
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
    ];
    const isLikelyCity = (name: any) => {
      if (!name || typeof name !== "string") return false;
      const clean = name.trim();
      if (clean.length < 2) return false;
      const lower = clean.toLowerCase();
      for (const t of bannedTokens) if (lower.includes(t)) return false;
      if (/city of|county of|province of|region of/.test(lower)) return false;
      return true;
    };

    for (const item of data) {
      const addr = item.address || {};
      const candidates = [addr.city, addr.town];
      for (const c of candidates) {
        if (isLikelyCity(c)) {
          citySet.add(c);
        }
      }
      // fallback: try display_name first token if it looks like a city
      if (item.display_name) {
        const parts = item.display_name.split(",").map((s: string) => s.trim());
        const candidate = parts[0];
        if (isLikelyCity(candidate)) citySet.add(candidate);
      }
    }

    const cities = Array.from(citySet).slice(0, 50);

    return NextResponse.json({ cities });
  } catch (error) {
    console.error("Error in locations/search:", error);
    return NextResponse.json({ cities: [] }, { status: 500 });
  }
}

