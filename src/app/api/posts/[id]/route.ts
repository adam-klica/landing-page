import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { Post } from "@/models/Post";
import { autoTranslate, translateHTML } from "@/lib/translate";
import { type Locale } from "@/lib/i18n";
import { requireAdmin, requireEditor, getCurrentUser } from "@/lib/auth";

// GET - Fetch single post by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const collection = await getCollection("posts");
    
    // Handle params as Promise (Next.js 16) or direct object
    const resolvedParams = params instanceof Promise ? await params : params;
    const postIdString = resolvedParams.id;
    
    // Validate ObjectId format
    let postId: ObjectId;
    try {
      if (!ObjectId.isValid(postIdString)) {
        return NextResponse.json({ error: `Invalid post ID format: ${postIdString}` }, { status: 400 });
      }
      postId = new ObjectId(postIdString);
    } catch (error: any) {
      console.error("ObjectId creation error:", error);
      return NextResponse.json({ error: `Invalid post ID: ${postIdString}` }, { status: 400 });
    }
    
    const post = await collection.findOne({
      _id: postId,
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...post,
      _id: post._id.toString(),
      createdAt: post.createdAt?.toISOString(),
      updatedAt: post.updatedAt?.toISOString(),
      publishedAt: post.publishedAt?.toISOString(),
      eventDate: post.eventDate?.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Only editor/moderator/admin can update posts
    await requireEditor();

    const body: any = await request.json();
    const collection = await getCollection("posts");

    // Handle params as Promise (Next.js 16) or direct object
    const resolvedParams = params instanceof Promise ? await params : params;
    const postIdString = resolvedParams.id;

    // Validate ObjectId format
    console.log("PUT request - params.id:", postIdString, "type:", typeof postIdString, "length:", postIdString?.length);
    let postId: ObjectId;
    try {
      if (!postIdString || postIdString.trim() === "") {
        return NextResponse.json({ error: `Post ID is required` }, { status: 400 });
      }
      if (!ObjectId.isValid(postIdString)) {
        console.error("Invalid ObjectId format:", postIdString);
        return NextResponse.json({ error: `Invalid post ID format: ${postIdString}` }, { status: 400 });
      }
      postId = new ObjectId(postIdString);
      console.log("ObjectId created successfully:", postId.toString());
    } catch (error: any) {
      console.error("ObjectId creation error:", error, "params.id:", postIdString);
      return NextResponse.json({ error: `Invalid post ID: ${postIdString}` }, { status: 400 });
    }

    // Check if post exists
    const existing = await collection.findOne({
      _id: postId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // If slug is being updated, check for conflicts (considering locale)
    const locale = body.locale || existing.locale || "me";
    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await collection.findOne({ slug: body.slug, locale: locale });
      if (slugExists && slugExists._id.toString() !== postIdString) {
        return NextResponse.json(
          { error: `Slug already exists for ${locale} locale` },
          { status: 400 }
        );
      }
    }

    // Convert eventDate from string to Date if provided
    let eventDate: Date | null | undefined;
    if (body.eventDate !== undefined) {
      if (body.eventDate === null || body.eventDate === "") {
        eventDate = null;
      } else {
        const parsedDate =
          typeof body.eventDate === "string" ? new Date(body.eventDate) : body.eventDate;
        if (!parsedDate || Number.isNaN(new Date(parsedDate).getTime())) {
          return NextResponse.json({ error: "Invalid event date format" }, { status: 400 });
        }
        eventDate = new Date(parsedDate);
      }
    }

    // Validate required fields if they're being updated
    if (body.title !== undefined && !body.title) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }
    if (body.slug !== undefined && !body.slug) {
      return NextResponse.json({ error: "Slug cannot be empty" }, { status: 400 });
    }

    const update: any = {
      updatedAt: new Date(),
    };

    // Get existing metadata or create new
    const existingMetadata = existing.metadata || {};
    const allLocales: Locale[] = ["me", "en", "it", "sq"];

    const baseLocale = ((existing.locale || "me") as Locale);
    const editLocale = ((body.editLocale || body.locale || baseLocale) as Locale);
    const isBaseEdit = editLocale === baseLocale;

    // Manual translation: translate only if client requests it
    const translateToLocales: Locale[] = Array.isArray(body.translateToLocales)
      ? body.translateToLocales
          .filter((l: any): l is Locale => allLocales.includes(l))
          .filter((l: Locale) => l !== editLocale)
      : [];

    const mergedTitleTranslations: Record<Locale, string> = {
      me: "",
      en: "",
      it: "",
      sq: "",
      ...(existingMetadata.titleTranslations || {}),
    };
    const mergedContentTranslations: Record<Locale, string> = {
      me: "",
      en: "",
      it: "",
      sq: "",
      ...(existingMetadata.contentTranslations || {}),
    };
    const mergedExcerptTranslations: Record<Locale, string> = {
      me: "",
      en: "",
      it: "",
      sq: "",
      ...(existingMetadata.excerptTranslations || {}),
    };

    // Only update base fields when editing the base locale.
    if (isBaseEdit) {
      if (body.title !== undefined) update.title = body.title;
      if (body.slug !== undefined) update.slug = body.slug;
      if (body.content !== undefined) update.content = body.content || "";
      if (body.excerpt !== undefined) update.excerpt = body.excerpt || "";
    }

    // Keep edited locale up-to-date in metadata (even if we don't translate now)
    const titleSource = (body.title !== undefined
      ? body.title
      : (isBaseEdit ? (existing.title || "") : (mergedTitleTranslations[editLocale] || ""))) as string;
    const contentSource = (body.content !== undefined
      ? body.content
      : (isBaseEdit ? (existing.content || "") : (mergedContentTranslations[editLocale] || ""))) as string;
    const excerptSource = (body.excerpt !== undefined
      ? body.excerpt
      : (isBaseEdit ? (existing.excerpt || "") : (mergedExcerptTranslations[editLocale] || ""))) as string;

    mergedTitleTranslations[editLocale] = titleSource;
    mergedContentTranslations[editLocale] = contentSource;
    mergedExcerptTranslations[editLocale] = excerptSource;

    if (translateToLocales.length > 0) {
      // Title
      if (titleSource && titleSource.trim()) {
        const translated = await autoTranslate(titleSource.trim(), editLocale, translateToLocales);
        for (const l of translateToLocales) mergedTitleTranslations[l] = translated[l] || "";
      }

      // Content (HTML-aware)
      if (contentSource && contentSource.trim()) {
        const contentHTML = contentSource.trim();
        const translated =
          contentHTML.includes("<") && contentHTML.includes(">")
            ? await translateHTML(contentHTML, editLocale, translateToLocales)
            : await autoTranslate(contentHTML, editLocale, translateToLocales);
        for (const l of translateToLocales) mergedContentTranslations[l] = translated[l] || "";
      }

      // Excerpt
      if (excerptSource && excerptSource.trim()) {
        const excerptText = excerptSource.trim();
        const translated =
          excerptText.includes("<") && excerptText.includes(">")
            ? await translateHTML(excerptText, editLocale, translateToLocales)
            : await autoTranslate(excerptText, editLocale, translateToLocales);
        for (const l of translateToLocales) mergedExcerptTranslations[l] = translated[l] || "";
      }
    }
    
    if (body.featuredImage !== undefined) update.featuredImage = body.featuredImage || "";
    if (body.status !== undefined) update.status = body.status;
    if (body.type !== undefined) update.type = body.type;
    // Never change base locale via translation edits unless explicitly editing base locale
    if (isBaseEdit && body.locale !== undefined) update.locale = body.locale;
    if (eventDate === null) {
      update.eventDate = null;
    } else if (eventDate !== undefined) {
      update.eventDate = eventDate;
    }
    if (body.eventLocation !== undefined) update.eventLocation = body.eventLocation || "";

    // Update metadata with (possibly partial) translations
    update.metadata = {
      ...existingMetadata,
      titleTranslations: mergedTitleTranslations,
      contentTranslations: mergedContentTranslations,
      excerptTranslations: mergedExcerptTranslations,
    };

    // If status changed to published, set publishedAt and publishedBy
    // Also handle republish (when republish flag is true and post is already published)
    const now = new Date();
    const isRepublish = body.republish === true && existing.status === "published";
    if ((body.status === "published" && existing.status !== "published") || isRepublish) {
      update.publishedAt = now;
      
      // Get current user for publishedBy
      const currentUser = await getCurrentUser();
      if (currentUser) {
        update.publishedBy = currentUser.userId;
        // Get user display name
        try {
          const usersCollection = await getCollection("users");
          const userId = new ObjectId(currentUser.userId);
          const user = await usersCollection.findOne({ _id: userId });
          update.publishedByName = user?.displayName || user?.username || undefined;
        } catch (error) {
          console.error("Error fetching user name:", error);
        }
      }
    }
    
    // Initialize viewCount if it doesn't exist
    if (existing.viewCount === undefined) {
      update.viewCount = 0;
    }

    // Update the current post
    const result = await collection.updateOne(
      { _id: postId },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Find and update all related posts with the same slug (different locales)
    // This ensures all language versions are updated when one is updated
    const slugToUpdate = body.slug !== undefined ? body.slug : existing.slug;
    const updatesForAllLocales: any = {
      updatedAt: now,
    };

    // Update shared fields that should be the same across all locales
    if (body.featuredImage !== undefined) updatesForAllLocales.featuredImage = body.featuredImage || "";
    if (body.status !== undefined) updatesForAllLocales.status = body.status;
    if (body.type !== undefined) updatesForAllLocales.type = body.type;
    if (eventDate === null) {
      updatesForAllLocales.eventDate = null;
    } else if (eventDate !== undefined) {
      updatesForAllLocales.eventDate = eventDate;
    }
    if (body.eventLocation !== undefined) updatesForAllLocales.eventLocation = body.eventLocation || "";
    // Handle republish for all locales
    const isRepublishForAll = body.republish === true && existing.status === "published";
    if (body.status === "published" || isRepublishForAll) {
      updatesForAllLocales.publishedAt = now;
      // Set publishedBy for all locales when publishing or republishing
      if (update.publishedBy) {
        updatesForAllLocales.publishedBy = update.publishedBy;
        updatesForAllLocales.publishedByName = update.publishedByName;
      }
    }

    // Update metadata with translations for all related posts
    updatesForAllLocales.metadata = {
      titleTranslations: mergedTitleTranslations,
      contentTranslations: mergedContentTranslations,
      excerptTranslations: mergedExcerptTranslations,
    };

    // Update all posts with the same slug (different locales)
    await collection.updateMany(
      { slug: slugToUpdate, _id: { $ne: postId } },
      { $set: updatesForAllLocales }
    );

    // Update each locale-specific post with its translated content
    // Only do this for requested locales; otherwise do not overwrite locale-specific documents.
    for (const targetLocale of translateToLocales) {
      const localeUpdate: any = {
        title: mergedTitleTranslations[targetLocale] || existing.title,
        content: mergedContentTranslations[targetLocale] || existing.content,
        excerpt: mergedExcerptTranslations[targetLocale] || existing.excerpt || "",
        updatedAt: now,
      };

      await collection.updateOne(
        { slug: slugToUpdate, locale: targetLocale },
        { $set: localeUpdate }
      );
    }

    const updated = await collection.findOne({
      _id: postId,
    });

    return NextResponse.json({
      ...updated,
      _id: updated!._id.toString(),
      createdAt: updated!.createdAt?.toISOString(),
      updatedAt: updated!.updatedAt?.toISOString(),
      publishedAt: updated!.publishedAt?.toISOString(),
      eventDate: updated!.eventDate?.toISOString(),
      updatedForAllLocales: true,
    });
  } catch (error: any) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update post" },
      { status: 500 }
    );
  }
}

// DELETE - Delete post (and all its locale versions)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Check admin authentication using requireAdmin
    const currentUser = await requireAdmin();
    console.log(`[DELETE] Admin user ${currentUser.userId} (role: ${currentUser.role}) attempting to delete post`);

    const collection = await getCollection("posts");
    
    // Handle params as Promise (Next.js 16) or direct object
    const resolvedParams = params instanceof Promise ? await params : params;
    const postIdString = resolvedParams.id;
    
    console.log(`[DELETE] Post ID string: ${postIdString}`);
    
    let postId: ObjectId;
    try {
      if (!ObjectId.isValid(postIdString)) {
        console.error(`[DELETE] Invalid post ID format: ${postIdString}`);
        return NextResponse.json({ error: `Invalid post ID format: ${postIdString}` }, { status: 400 });
      }
      postId = new ObjectId(postIdString);
      console.log(`[DELETE] Valid ObjectId created: ${postId.toString()}`);
    } catch (error: any) {
      console.error(`[DELETE] Error creating ObjectId:`, error);
      return NextResponse.json({ error: `Invalid post ID: ${postIdString}` }, { status: 400 });
    }

    // First, find the post to get its slug
    const post = await collection.findOne({ _id: postId });
    if (!post) {
      console.log(`[DELETE] Post not found with ID: ${postIdString}`);
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get slug or use post ID as fallback
    const slugToDelete = post.slug || `post-${postIdString}`;
    console.log(`[DELETE] Found post with slug: ${slugToDelete}, deleting all posts with this slug`);

    // Delete all posts with the same slug (all locale versions)
    // Also handle case where slug might be null/undefined
    const deleteQuery: any = {};
    if (post.slug) {
      deleteQuery.slug = post.slug;
    } else {
      // If no slug, delete by ID only
      deleteQuery._id = postId;
    }
    
    const result = await collection.deleteMany(deleteQuery);

    console.log(`[DELETE] Delete result: ${result.deletedCount} post(s) deleted`);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} post(s)${post.slug ? ` with slug: ${post.slug}` : ` with ID: ${postIdString}`}`
    });
  } catch (error: any) {
    console.error("[DELETE] Error deleting post:", error);
    // Handle authentication errors
    if (error.message === "Unauthorized" || error.message.includes("Forbidden") || error.message.includes("Admin access required")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to delete post" },
      { status: 500 }
    );
  }
}
