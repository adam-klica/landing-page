import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";

// POST - Track a page visit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page, referrer } = body;

    const collection = await getCollection("visitors");
    const today = new Date();
    const visitDate = today.toISOString().split("T")[0]; // YYYY-MM-DD format

    // Check if we already have a visit for this IP and page today
    // We'll use a simple approach: insert a new visit each time
    // In production, you might want to track by IP or user ID to avoid duplicates
    
    await collection.insertOne({
      visit_date: visitDate,
      page: page || "/",
      referrer: referrer || "",
      visitedAt: today,
      createdAt: today,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error tracking visitor:", error);
    // Don't fail the request if tracking fails
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 200 }
    );
  }
}
