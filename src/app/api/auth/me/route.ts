import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCachedAuthUser } from "@/lib/userCache";

const CACHE_HEADER = "private, max-age=30, stale-while-revalidate=60";

export async function GET(request: NextRequest) {
  // Skip DB work for Next.js prefetch requests.
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch");

  if (isPrefetch) {
    return NextResponse.json(
      { user: null },
      { headers: { "Cache-Control": "private, max-age=30" } }
    );
  }

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { user: null },
        { headers: { "Cache-Control": CACHE_HEADER } }
      );
    }

    const user = await getCachedAuthUser(currentUser.userId);
    if (!user) {
      return NextResponse.json(
        { user: null },
        { headers: { "Cache-Control": CACHE_HEADER } }
      );
    }

    return NextResponse.json(
      { user },
      { headers: { "Cache-Control": CACHE_HEADER } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
