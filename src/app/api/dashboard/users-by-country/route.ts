import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";

export async function GET() {
  try {
    const collection = await getCollection("users");
    const users = await collection.find({}).project({ location: 1 }).toArray();

    const countryCounts: Record<string, number> = {};
    users.forEach((user) => {
      if (user.location) {
        const parts = user.location.split(",");
        const country = parts[parts.length - 1]?.trim();
        if (country) {
          countryCounts[country] = (countryCounts[country] || 0) + 1;
        }
      }
    });

    const result = Object.entries(countryCounts).map(([country, total]) => ({
      country,
      total: total.toString(),
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
