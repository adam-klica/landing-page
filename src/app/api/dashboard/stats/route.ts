import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Cache stats for 30 seconds to improve performance
let cachedStats: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds

export async function GET() {
  // Return cached data if still valid
  const now = Date.now();
  if (cachedStats && (now - cacheTimestamp) < CACHE_DURATION) {
    return NextResponse.json(cachedStats, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  }
  try {
    const db = await getDb();

    // Get all stats in parallel
    const [
      totalUsers,
      totalPosts,
      totalConnections,
      totalMessages,
      publishedPosts,
      draftPosts,
      acceptedConnections,
      onlineUsers,
    ] = await Promise.all([
      db.collection("users").countDocuments({}),
      db.collection("posts").countDocuments({}),
      db.collection("connections").countDocuments({}),
      db.collection("messages").countDocuments({}),
      db.collection("posts").countDocuments({ status: "published" }),
      db.collection("posts").countDocuments({ status: "draft" }),
      db.collection("connections").countDocuments({ status: "accepted" }),
      db.collection("users").countDocuments({ status: "online" }),
    ]);

    // Get posts by type
    const postsByType = await db
      .collection("posts")
      .aggregate([
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const postsByTypeMap: Record<string, number> = {};
    postsByType.forEach((item) => {
      postsByTypeMap[item._id] = item.count;
    });

    // Get recent posts (last 5) - exclude large fields
    const recentPosts = await db
      .collection("posts")
      .find({})
      .project({
        content: 0, // Exclude large content
        excerpt: 0, // Exclude excerpt
        metadata: 0, // Exclude translations
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Get recent users (last 5) - exclude large fields
    const recentUsers = await db
      .collection("users")
      .find({})
      .project({
        password: 0,
        about: 0,
        experience: 0,
        education: 0,
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const response = {
      stats: {
        totalUsers,
        totalPosts,
        totalConnections,
        totalMessages,
        publishedPosts,
        draftPosts,
        acceptedConnections,
        onlineUsers,
      },
      postsByType: {
        news: postsByTypeMap["news"] || 0,
        events: postsByTypeMap["event"] || 0,
        resources: 0,
      },
      recentPosts: recentPosts.map((post) => ({
        _id: post._id.toString(),
        title: post.title,
        type: post.type,
        status: post.status,
        createdAt: post.createdAt,
        slug: post.slug,
      })),
      recentUsers: recentUsers.map((user) => ({
        _id: user._id.toString(),
        username: user.username,
        displayName: user.displayName || user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })),
    };

    // Cache the response
    cachedStats = response;
    cacheTimestamp = now;

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    // Return valid structure with default values even on error
    return NextResponse.json({
      stats: {
        totalUsers: 0,
        totalPosts: 0,
        totalConnections: 0,
        totalMessages: 0,
        publishedPosts: 0,
        draftPosts: 0,
        acceptedConnections: 0,
        onlineUsers: 0,
      },
      postsByType: {
        news: 0,
        events: 0,
        resources: 0,
      },
      recentPosts: [],
      recentUsers: [],
      error: error.message, // Include error for debugging
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }); // Return 200 so client doesn't treat it as an error
  }
}
