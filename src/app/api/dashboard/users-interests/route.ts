import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";

export async function GET() {
  try {
    const collection = await getCollection("users");
    const users = await collection
      .find({ interests: { $exists: true, $ne: "" } })
      .project({ interests: 1 })
      .toArray();

    const interestCounts: Record<string, number> = {};
    users.forEach((user) => {
      if (user.interests) {
        const interests = user.interests.split(",").map((i: string) => i.trim());
        interests.forEach((interest: string) => {
          if (interest) {
            interestCounts[interest] = (interestCounts[interest] || 0) + 1;
          }
        });
      }
    });

    const result = Object.entries(interestCounts)
      .map(([interest, count]) => ({
        interest,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
