import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { autoTranslate, translateHTML } from "@/lib/translate";
import { type Locale } from "@/lib/i18n";
import { Post } from "@/models/Post";

// This endpoint helps migrate existing posts to the new structure
// and creates translations for all languages
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const collection = await getCollection("posts");
    const allPosts = await collection.find({}).toArray();

    let migrated = 0;
    let skipped = 0;
    let translated = 0;
    const allLocales: Locale[] = ["me", "en", "it", "sq"];

    // Group posts by slug to find unique posts
    const postsBySlug = new Map<string, any[]>();
    
    for (const post of allPosts) {
      const slug = post.slug || `post-${post._id.toString()}`;
      if (!postsBySlug.has(slug)) {
        postsBySlug.set(slug, []);
      }
      postsBySlug.get(slug)!.push(post);
    }

    // Helper function to check for error messages
    const containsErrorMessage = (text: string): boolean => {
      if (!text || typeof text !== "string") return false;
      return text.includes("QUERY LENGTH LIMIT") || 
             text.includes("MAX ALLOWED QUERY") ||
             text.includes("500 CHARS");
    };

    // Helper function to clean error messages
    const cleanErrorMessage = (text: string): string => {
      if (!text || typeof text !== "string") return text;
      const errorPatterns = [
        /QUERY LENGTH LIMIT EXCEEDED[^<]*/gi,
        /MAX ALLOWED QUERY[^<]*/gi,
        /500 CHARS[^<]*/gi,
      ];
      let cleaned = text;
      errorPatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, "");
      });
      return cleaned.trim();
    };

    // Process each post individually to add translations to metadata
    // We'll update each post with translations, not create new ones
    for (const post of allPosts) {
      try {
        // Ensure post has required fields
        const updates: any = {};
        
        // Clean error messages from existing content/excerpt
        if (post.content && typeof post.content === "string" && 
            (post.content.includes("QUERY LENGTH LIMIT") || 
             post.content.includes("MAX ALLOWED QUERY") ||
             post.content.includes("500 CHARS"))) {
          updates.content = cleanErrorMessage(post.content);
          migrated++;
        }
        if (post.excerpt && typeof post.excerpt === "string" && 
            (post.excerpt.includes("QUERY LENGTH LIMIT") || 
             post.excerpt.includes("MAX ALLOWED QUERY") ||
             post.excerpt.includes("500 CHARS"))) {
          updates.excerpt = cleanErrorMessage(post.excerpt);
          migrated++;
        }
        
        if (!post.type) {
          const title = ((post.title || "") as string).toLowerCase();
          if (title.includes("event") || title.includes("dogadjaj")) {
            updates.type = "event";
          } else {
            updates.type = "news";
          }
          migrated++;
        }
        if (!post.status) {
          updates.status = "draft";
          migrated++;
        }
        if (!post.createdAt) {
          updates.createdAt = new Date();
          migrated++;
        }
        if (!post.updatedAt) {
          updates.updatedAt = post.createdAt || new Date();
          migrated++;
        }
        if (post.status === "published" && !post.publishedAt) {
          updates.publishedAt = post.createdAt || new Date();
          migrated++;
        }
        if (!post.locale) {
          updates.locale = "me"; // Default locale
          migrated++;
        }

        // Determine source locale
        const sourceLocale = ((post.locale || "me") as Locale);
        const sourceTitle = post.title || "";
        const sourceContent = post.content || "";
        const sourceExcerpt = post.excerpt || "";

        // Clean error messages from existing metadata translations
        if (post.metadata) {
          if (post.metadata.titleTranslations) {
            for (const locale of ["me", "en", "it", "sq"] as Locale[]) {
              if (post.metadata.titleTranslations[locale] && 
                  containsErrorMessage(post.metadata.titleTranslations[locale])) {
                if (!updates.metadata) updates.metadata = { ...post.metadata };
                if (!updates.metadata.titleTranslations) updates.metadata.titleTranslations = { ...post.metadata.titleTranslations };
                updates.metadata.titleTranslations[locale] = cleanErrorMessage(post.metadata.titleTranslations[locale]);
                migrated++;
              }
            }
          }
          if (post.metadata.contentTranslations) {
            for (const locale of ["me", "en", "it", "sq"] as Locale[]) {
              if (post.metadata.contentTranslations[locale] && 
                  containsErrorMessage(post.metadata.contentTranslations[locale])) {
                if (!updates.metadata) updates.metadata = { ...post.metadata };
                if (!updates.metadata.contentTranslations) updates.metadata.contentTranslations = { ...post.metadata.contentTranslations };
                updates.metadata.contentTranslations[locale] = cleanErrorMessage(post.metadata.contentTranslations[locale]);
                migrated++;
              }
            }
          }
          if (post.metadata.excerptTranslations) {
            for (const locale of ["me", "en", "it", "sq"] as Locale[]) {
              if (post.metadata.excerptTranslations[locale] && 
                  containsErrorMessage(post.metadata.excerptTranslations[locale])) {
                if (!updates.metadata) updates.metadata = { ...post.metadata };
                if (!updates.metadata.excerptTranslations) updates.metadata.excerptTranslations = { ...post.metadata.excerptTranslations };
                updates.metadata.excerptTranslations[locale] = cleanErrorMessage(post.metadata.excerptTranslations[locale]);
                migrated++;
              }
            }
          }
        }

        // Check if post already has translations in metadata
        const hasTranslations = post.metadata?.titleTranslations && 
                                Object.keys(post.metadata.titleTranslations).length === 4;

        // Only translate if translations don't exist or are incomplete
        if (!hasTranslations) {
          // Translate content
          let titleTranslations: Record<Locale, string> = {
            me: sourceTitle,
            en: sourceTitle,
            it: sourceTitle,
            sq: sourceTitle,
          };
          let contentTranslations: Record<Locale, string> = {
            me: sourceContent,
            en: sourceContent,
            it: sourceContent,
            sq: sourceContent,
          };
          let excerptTranslations: Record<Locale, string> = {
            me: sourceExcerpt,
            en: sourceExcerpt,
            it: sourceExcerpt,
            sq: sourceExcerpt,
          };

          try {
            console.log(`[MIGRATE] Translating post ${post.slug || post._id} (locale: ${sourceLocale})`);
            
            // Translate title
            if (sourceTitle && sourceTitle.trim()) {
              titleTranslations = await autoTranslate(sourceTitle.trim(), sourceLocale);
            }
            
            // Translate content (HTML) - use translateHTML to preserve structure
            if (sourceContent && sourceContent.trim()) {
              const contentHTML = sourceContent.trim();
              // Check if content is HTML or plain text
              if (contentHTML.includes("<") && contentHTML.includes(">")) {
                // It's HTML, use translateHTML
                contentTranslations = await translateHTML(contentHTML, sourceLocale);
              } else {
                // Plain text, use autoTranslate
                contentTranslations = await autoTranslate(contentHTML, sourceLocale);
              }
            }
            
            // Translate excerpt - check if HTML or plain text
            if (sourceExcerpt && sourceExcerpt.trim()) {
              const excerptText = sourceExcerpt.trim();
              if (excerptText.includes("<") && excerptText.includes(">")) {
                // HTML excerpt
                excerptTranslations = await translateHTML(excerptText, sourceLocale);
              } else {
                // Plain text excerpt
                excerptTranslations = await autoTranslate(excerptText, sourceLocale);
              }
            }

            // Clean error messages from translations before saving
            const cleanErrorMessage = (text: string): string => {
              if (!text || typeof text !== "string") return text;
              const errorPatterns = [
                /QUERY LENGTH LIMIT EXCEEDED[^<]*/gi,
                /MAX ALLOWED QUERY[^<]*/gi,
                /500 CHARS[^<]*/gi,
              ];
              let cleaned = text;
              errorPatterns.forEach(pattern => {
                cleaned = cleaned.replace(pattern, "");
              });
              return cleaned.trim();
            };

            // Clean all translations
            for (const locale of ["me", "en", "it", "sq"] as Locale[]) {
              if (titleTranslations[locale]) {
                titleTranslations[locale] = cleanErrorMessage(titleTranslations[locale]);
              }
              if (contentTranslations[locale]) {
                contentTranslations[locale] = cleanErrorMessage(contentTranslations[locale]);
              }
              if (excerptTranslations[locale]) {
                excerptTranslations[locale] = cleanErrorMessage(excerptTranslations[locale]);
              }
            }

            // Also clean original content/excerpt if they contain errors
            if (updates.content === undefined && sourceContent) {
              updates.content = cleanErrorMessage(sourceContent);
            }
            if (updates.excerpt === undefined && sourceExcerpt) {
              updates.excerpt = cleanErrorMessage(sourceExcerpt);
            }

            // Add translations to metadata
            updates.metadata = {
              titleTranslations,
              contentTranslations,
              excerptTranslations,
            };
            
            translated++;
            console.log(`[MIGRATE] Successfully translated post ${post.slug || post._id}`);
          } catch (error) {
            console.error(`[MIGRATE] Translation error for post ${post.slug || post._id}:`, error);
            // Continue with original text if translation fails
          }
        } else {
          console.log(`[MIGRATE] Post ${post.slug || post._id} already has translations, skipping`);
          skipped++;
        }

        // Update post with all changes
        if (Object.keys(updates).length > 0) {
          await collection.updateOne(
            { _id: post._id },
            { $set: updates }
          );
        }
      } catch (error) {
        console.error(`[MIGRATE] Error processing post ${post._id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      total: allPosts.length,
      migrated,
      skipped,
      translated,
      message: `Updated ${migrated} fields and added translations to ${translated} posts. ${skipped} posts already had translations.`,
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Migration failed" },
      { status: 500 }
    );
  }
}
