import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";

export async function GET() {
  try {
    const collection = await getCollection("users");
    const users = await collection.find({}).project({ location: 1 }).toArray();

    const cityCounts: Record<string, number> = {};
    users.forEach((user) => {
      if (user.location) {
        const city = user.location.split(",")[0]?.trim();
        if (city) {
          cityCounts[city] = (cityCounts[city] || 0) + 1;
        }
      }
    });

    const result = Object.entries(cityCounts).map(([city, total]) => ({
      city,
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
