import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";

export async function GET() {
  try {
    const collection = await getCollection("visitors");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format

    // Count visits from today (visit_date as string in YYYY-MM-DD format)
    const todayCount = await collection.countDocuments({
      visit_date: todayStr,
    });

    const totalCount = await collection.countDocuments({});

    return NextResponse.json({
      today: todayCount.toString(),
      total: totalCount.toString(),
    });
  } catch (error: any) {
    console.error("Error fetching visitors:", error);
    return NextResponse.json(
      { today: "0", total: "0" },
      { status: 200 }
    );
  }
}
