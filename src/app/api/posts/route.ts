import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { Post } from "@/models/Post";
import { autoTranslate, translateHTML } from "@/lib/translate";
import { type Locale } from "@/lib/i18n";
import { requireEditor } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET - Fetch all posts (with optional filtering by type)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // news, event
    const status = searchParams.get("status"); // null means show all
    const locale = searchParams.get("locale"); // me, en, it, sq
    const limit = parseInt(searchParams.get("limit") || "100"); // Increased limit for admin
    const page = parseInt(searchParams.get("page") || "1");
    const includeContent = searchParams.get("includeContent") === "true"; // Only include content if explicitly requested
    const skip = (page - 1) * limit;

    const collection = await getCollection("posts");

    const query: any = {};
    // Only filter by type if provided and not "all"
    if (type && type !== "all") {
      query.type = type;
    }
    // Only filter by status if explicitly provided
    if (status && status !== "") {
      query.status = status;
    }
    // Filter by locale if provided
    if (locale) {
      query.locale = locale;
    }

    // Build projection - exclude large content field unless explicitly requested
    const projection: any = {};
    if (!includeContent) {
      projection.content = 0;
      projection.excerpt = 0;
      projection.metadata = 0;
      projection.featuredImage = 0;
    }

    const posts = await collection
      .find(query)
      .project(includeContent ? {} : projection) // Only apply projection if not including content
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments(query);

    return NextResponse.json({
      posts: posts.map((post) => ({
        ...post,
        _id: post._id.toString(),
        createdAt: post.createdAt?.toISOString(),
        updatedAt: post.updatedAt?.toISOString(),
        publishedAt: post.publishedAt?.toISOString(),
        eventDate: post.eventDate?.toISOString(),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }, {
      headers: {
        'Cache-Control': status === 'published' 
          ? 'public, s-maxage=60, stale-while-revalidate=120'
          : 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    // Only editor/moderator/admin can create posts
    const currentUser = await requireEditor();

    const body: any = await request.json();
    const collection = await getCollection("posts");
    const locale = body.locale || "me";

    // Validate required fields
    if (!body.title || !body.type || !body.slug) {
      return NextResponse.json(
        { error: "Missing required fields: title, type, slug" },
        { status: 400 }
      );
    }
    
    // Content can be empty HTML, so just check if it exists (even if empty string)
    if (body.content === undefined || body.content === null) {
      return NextResponse.json(
        { error: "Content field is required" },
        { status: 400 }
      );
    }

    // Check if slug already exists for this locale
    // If it exists, automatically append a number to make it unique
    let finalSlug = body.slug;
    let slugCounter = 1;
    let existing = await collection.findOne({ slug: finalSlug, locale });
    
    while (existing) {
      finalSlug = `${body.slug}-${slugCounter}`;
      existing = await collection.findOne({ slug: finalSlug, locale });
      slugCounter++;
      
      // Safety check to prevent infinite loop
      if (slugCounter > 100) {
        console.error(`[POST CREATE] Could not generate unique slug after 100 attempts for ${body.slug}`);
        return NextResponse.json(
          { error: `Could not generate unique slug. Please try a different slug.` },
          { status: 400 }
        );
      }
    }
    
    if (slugCounter > 1) {
      console.log(`[POST CREATE] Slug ${body.slug} already exists for locale ${locale}, using ${finalSlug} instead`);
    } else {
      console.log(`[POST CREATE] Slug ${finalSlug} is available for locale ${locale}, proceeding with creation`);
    }

    const now = new Date();
    
    // Get current user for publishedBy
    let publishedBy: string | undefined;
    let publishedByName: string | undefined;
    
    if (currentUser) {
      publishedBy = currentUser.userId;
      // Get user display name
      try {
        const usersCollection = await getCollection("users");
        const userId = new ObjectId(currentUser.userId);
        const user = await usersCollection.findOne({ _id: userId });
        publishedByName = user?.displayName || user?.username || undefined;
      } catch (error) {
        console.error("Error fetching user name:", error);
      }
    }
    
    // Convert eventDate from string to Date if provided
    let eventDate: Date | undefined;
    if (body.eventDate) {
      eventDate = typeof body.eventDate === "string" 
        ? new Date(body.eventDate) 
        : body.eventDate;
    }

    // Manual translation only: translate only if client requests it
    const sourceLocale = locale as Locale;
    const allLocales: Locale[] = ["me", "en", "it", "sq"];

    const initMap = (value: string): Record<Locale, string> => ({
      me: "",
      en: "",
      it: "",
      sq: "",
      [sourceLocale]: value,
    } as Record<Locale, string>);

    const translateToLocales: Locale[] = Array.isArray(body.translateToLocales)
      ? body.translateToLocales
          .filter((l: any): l is Locale => allLocales.includes(l))
          .filter((l: Locale) => l !== sourceLocale)
      : [];

    let titleTranslations = initMap(body.title || "");
    let contentTranslations = initMap(body.content || "");
    let excerptTranslations = initMap(body.excerpt || "");

    if (translateToLocales.length > 0) {
      // Title
      if (body.title && body.title.trim()) {
        const translated = await autoTranslate(body.title.trim(), sourceLocale, translateToLocales);
        for (const l of translateToLocales) titleTranslations[l] = translated[l] || "";
      }

      // Content (HTML-aware)
      if (body.content && body.content.trim()) {
        const contentHTML = body.content.trim();
        const translated =
          contentHTML.includes("<") && contentHTML.includes(">")
            ? await translateHTML(contentHTML, sourceLocale, translateToLocales)
            : await autoTranslate(contentHTML, sourceLocale, translateToLocales);
        for (const l of translateToLocales) contentTranslations[l] = translated[l] || "";
      }

      // Excerpt
      if (body.excerpt && body.excerpt.trim()) {
        const excerptText = body.excerpt.trim();
        const translated =
          excerptText.includes("<") && excerptText.includes(">")
            ? await translateHTML(excerptText, sourceLocale, translateToLocales)
            : await autoTranslate(excerptText, sourceLocale, translateToLocales);
        for (const l of translateToLocales) excerptTranslations[l] = translated[l] || "";
      }
    }

    // Create only one post for the current locale, but store translations in metadata
    // Translations can be used to create other locale versions later if needed
    const post: Omit<Post, "_id"> = {
      title: body.title,
      slug: finalSlug, // Use the unique slug
      content: body.content,
      excerpt: body.excerpt || "",
      featuredImage: body.featuredImage || "",
      type: body.type,
      status: body.status || "draft",
      locale: sourceLocale,
      createdAt: now,
      updatedAt: now,
      publishedAt: body.status === "published" ? now : undefined,
      eventDate: eventDate,
      eventLocation: body.eventLocation || "",
      viewCount: 0,
      publishedBy: body.status === "published" ? publishedBy : undefined,
      publishedByName: body.status === "published" ? publishedByName : undefined,
      // Store translations in metadata - these are automatically generated and can be used later
      metadata: {
        titleTranslations,
        contentTranslations,
        excerptTranslations,
      },
    };

    // Insert the post
    const result = await collection.insertOne(post);
    const insertedId = result.insertedId.toString();

    console.log(`[POST CREATE] Created post ${insertedId} for locale ${sourceLocale} with translations:`, {
      hasTitleTranslations: !!titleTranslations,
      hasContentTranslations: !!contentTranslations,
      hasExcerptTranslations: !!excerptTranslations,
      titleTranslationKeys: Object.keys(titleTranslations || {}),
      contentTranslationKeys: Object.keys(contentTranslations || {}),
      excerptTranslationKeys: Object.keys(excerptTranslations || {}),
    });

    return NextResponse.json({
      _id: insertedId,
      ...post,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      publishedAt: post.publishedAt?.toISOString(),
      eventDate: post.eventDate?.toISOString(),
      createdForAllLocales: false,
      insertedCount: 1,
    });
  } catch (error: any) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create post" },
      { status: 500 }
    );
  }
}
