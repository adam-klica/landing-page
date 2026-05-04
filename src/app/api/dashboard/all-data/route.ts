import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
    
    // Only fetch location and interests fields - drastically reduces data transfer
    const users = await db.collection("users")
      .find({})
      .project({
        location: 1,
        interests: 1,
        _id: 0, // Exclude _id to save space
      })
      .toArray();

    // Process location data (city, region, country) in one pass
    const cityCounts: Record<string, number> = {};
    const regionCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const interestCounts: Record<string, number> = {};

    users.forEach((user: any) => {
      // Process location
      if (user.location) {
        const parts = user.location.split(",").map((p: string) => p.trim());
        if (parts.length > 0) {
          const city = parts[0];
          if (city) cityCounts[city] = (cityCounts[city] || 0) + 1;
        }
        if (parts.length > 1) {
          const region = parts[1];
          if (region) regionCounts[region] = (regionCounts[region] || 0) + 1;
        }
        if (parts.length > 0) {
          const country = parts[parts.length - 1];
          if (country) countryCounts[country] = (countryCounts[country] || 0) + 1;
        }
      }

      // Process interests
      if (user.interests) {
        const interests = user.interests.split(",").map((i: string) => i.trim());
        interests.forEach((interest: string) => {
          if (interest) {
            interestCounts[interest] = (interestCounts[interest] || 0) + 1;
          }
        });
      }
    });

    // Convert to arrays and sort
    const cities = Object.entries(cityCounts)
      .map(([city, total]) => ({ city, total: total.toString() }))
      .sort((a, b) => parseInt(b.total) - parseInt(a.total));

    const regions = Object.entries(regionCounts)
      .map(([region, total]) => ({ region, total: total.toString() }))
      .sort((a, b) => parseInt(b.total) - parseInt(a.total));

    const countries = Object.entries(countryCounts)
      .map(([country, total]) => ({ country, total: total.toString() }))
      .sort((a, b) => parseInt(b.total) - parseInt(a.total));

    const interests = Object.entries(interestCounts)
      .map(([interest, count]) => ({ interest, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      cities,
      regions,
      countries,
      interests,
    });
  } catch (error: any) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
