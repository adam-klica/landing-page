import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET - Globalna pretraga (posts i users)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || "all"; // "all", "users", "posts"

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        users: [], 
        posts: [],
        total: 0
      });
    }

    const db = await getDb();
    const searchQuery = query.trim();
    const regexQuery = { $regex: searchQuery, $options: "i" };

    const results: {
      users: any[];
      posts: any[];
    } = {
      users: [],
      posts: [],
    };

    // Search users if type is "all" or "users"
    if (type === "all" || type === "users") {
      const userFilter: any = { 
        _id: { $ne: new ObjectId(currentUser.userId) },
        $or: [
          { username: regexQuery },
          { email: regexQuery },
          { displayName: regexQuery },
          { headline: regexQuery },
          { organization: regexQuery },
        ]
      };

      const users = await db.collection("users")
        .find(userFilter)
        .project({ password: 0 })
        .limit(50)
        .toArray();

      results.users = users.map((u: any) => ({
        _id: u._id.toString(),
        username: u.username,
        email: u.email,
        displayName: u.displayName,
        profilePicture: u.profilePicture,
        headline: u.headline,
        organization: u.organization,
        location: u.location,
        country: u.country,
        city: u.city,
      }));
    }

    // Search posts if type is "all" or "posts"
    if (type === "all" || type === "posts") {
      const postFilter: any = {
        status: "published",
        $or: [
          { title: regexQuery },
          { excerpt: regexQuery },
          { content: regexQuery }, // Search in content (HTML)
          { "metadata.titleTranslations.me": regexQuery },
          { "metadata.titleTranslations.en": regexQuery },
          { "metadata.titleTranslations.it": regexQuery },
          { "metadata.titleTranslations.sq": regexQuery },
          { "metadata.excerptTranslations.me": regexQuery },
          { "metadata.excerptTranslations.en": regexQuery },
          { "metadata.excerptTranslations.it": regexQuery },
          { "metadata.excerptTranslations.sq": regexQuery },
          { "metadata.contentTranslations.me": regexQuery },
          { "metadata.contentTranslations.en": regexQuery },
          { "metadata.contentTranslations.it": regexQuery },
          { "metadata.contentTranslations.sq": regexQuery },
        ]
      };

      const posts = await db.collection("posts")
        .find(postFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      results.posts = posts.map((p: any) => ({
        _id: p._id.toString(),
        title: p.title,
        excerpt: p.excerpt,
        slug: p.slug,
        type: p.type,
        locale: p.locale,
        featuredImage: p.featuredImage,
        createdAt: p.createdAt?.toISOString(),
        publishedAt: p.publishedAt?.toISOString(),
        metadata: p.metadata,
      }));
    }

    return NextResponse.json({
      users: results.users,
      posts: results.posts,
      total: results.users.length + results.posts.length,
    });
  } catch (error: any) {
    console.error("Error in global search:", error);
    return NextResponse.json(
      { error: "Failed to search", users: [], posts: [], total: 0 },
      { status: 500 }
    );
  }
}
