import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCachedAuthUser } from "@/lib/userCache";

// NEVER cache "no user" responses — that causes a freshly-logged-in user
// to keep seeing a stale `{user: null}` and get bounced back to /login.
// Only cache the positive (authenticated) response, and only briefly.
const AUTHED_CACHE = "private, max-age=15, stale-while-revalidate=30";
const ANON_CACHE = "private, no-store";

export async function GET(request: NextRequest) {
  // Skip DB work for Next.js prefetch requests, but DO NOT cache them either —
  // a prefetched null would poison subsequent real requests after login.
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch");

  if (isPrefetch) {
    return NextResponse.json(
      { user: null },
      { headers: { "Cache-Control": ANON_CACHE } }
    );
  }

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { user: null },
        { headers: { "Cache-Control": ANON_CACHE } }
      );
    }

    const user = await getCachedAuthUser(currentUser.userId);
    if (!user) {
      return NextResponse.json(
        { user: null },
        { headers: { "Cache-Control": ANON_CACHE } }
      );
    }

    return NextResponse.json(
      { user },
      { headers: { "Cache-Control": AUTHED_CACHE } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: { "Cache-Control": ANON_CACHE } }
    );
  }
}
