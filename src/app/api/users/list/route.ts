import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const q = searchParams.get("q") || "";
    const country = searchParams.get("country") || "";
    const city = searchParams.get("city") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDir = searchParams.get("sortDir") || "desc";

    const db = await getDb();

    const filter: any = {};
    if (country) filter.country = country;
    if (city) filter.city = city;

    // Search across multiple fields
    if (q && q.trim().length >= 2) {
      const regex = { $regex: q.trim(), $options: "i" };
      filter.$or = [
        { username: regex },
        { email: regex },
        { displayName: regex },
        { headline: regex },
        { organization: regex },
      ];
    }

    const skip = (Math.max(page, 1) - 1) * limit;

    const sortMap: Record<string, any> = {
      createdAt: { createdAt: sortDir === "asc" ? 1 : -1 },
      name: { displayName: sortDir === "asc" ? 1 : -1, username: sortDir === "asc" ? 1 : -1 },
      email: { email: sortDir === "asc" ? 1 : -1 },
      organization: { organization: sortDir === "asc" ? 1 : -1 },
    };
    const sortObj = sortMap[sortBy] || sortMap.createdAt;

    const users = await db
      .collection("users")
      .find(filter)
      .project({
        password: 0,
        about: 0,
        experience: 0,
        education: 0,
      })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection("users").countDocuments(filter);

    return NextResponse.json({
      users: users.map((u: any) => {
        // Return all fields except password
        const { password, ...userWithoutPassword } = u;
        return {
          ...userWithoutPassword,
          _id: u._id.toString(),
        };
      }),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("Error fetching users list:", err);
    console.error("Error details:", err.message, err.stack);
    // Return 200 with empty array instead of 500, so frontend can handle it gracefully
    return NextResponse.json({ 
      users: [], 
      page: 1, 
      limit: 0, 
      total: 0,
      totalPages: 0,
      error: err.message || "Failed to fetch users"
    }, { status: 200 });
  }
}

