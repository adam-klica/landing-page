import type { Metadata } from "next";
import { Post } from "@/models/Post";
import { notFound } from "next/navigation";
import Link from "next/link";
import { locales, localeFlagEmojis, localeNames, localeHreflang, type Locale } from "@/lib/i18n";
import { localeLink } from "@/lib/localeLink";
import { getCollection } from "@/lib/db";
import { PostViewTracker } from "@/components/PostViewTracker";
import { processPostContent } from "@/lib/processPostContent";
import { srCyrToLat } from "@/lib/transliterate";
import { getTranslations } from "@/lib/getTranslations";

export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://southadriaticskills.org";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: loc, slug } = await params;
  const locale = (loc as Locale) || "en";

  try {
    const collection = await getCollection("posts");
    const post = await collection.findOne({ slug, status: "published" });
    if (!post) return { title: "Post Not Found" };

    let title = post.title || "";
    let description = post.excerpt || post.content?.substring(0, 160) || "";

    // Use translation if available
    if (post.metadata?.titleTranslations?.[locale]) {
      title = post.metadata.titleTranslations[locale];
    }
    if (post.metadata?.excerptTranslations?.[locale]) {
      description = post.metadata.excerptTranslations[locale];
    }

    // Strip HTML tags from description
    description = description.replace(/<[^>]*>/g, "").substring(0, 160);

    const languages: Record<string, string> = {};
    for (const l of locales) {
      languages[localeHreflang[l]] = `${BASE_URL}/${l}/posts/${slug}`;
    }

    return {
      title,
      description,
      alternates: {
        canonical: `${BASE_URL}/${locale}/posts/${slug}`,
        languages,
      },
      openGraph: {
        title,
        description,
        type: "article",
        url: `${BASE_URL}/${locale}/posts/${slug}`,
        publishedTime: post.publishedAt?.toISOString(),
        modifiedTime: post.updatedAt?.toISOString(),
        ...(post.featuredImage && {
          images: [{ url: post.featuredImage, alt: title }],
        }),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(post.featuredImage && { images: [post.featuredImage] }),
      },
    };
  } catch {
    return { title: "Post" };
  }
}

async function getPostBySlug(slug: string, locale: Locale): Promise<Post | null> {
  try {
    const collection = await getCollection("posts");
    
    // First try to find post with matching locale
    let post = await collection.findOne({
      slug: slug,
      status: "published",
      locale: locale,
    });

    // If not found, try to find any post with this slug (might be from different locale)
    if (!post) {
      post = await collection.findOne({
        slug: slug,
        status: "published",
      });
    }

    if (!post) {
      return null;
    }

    // Use translations from metadata if available for current locale
    const postData: Post = {
      ...post,
      _id: post._id.toString(),
      type: post.type || "news",
      title: post.title || "",
      slug: post.slug || "",
      content: post.content || "",
      status: post.status || "draft",
      createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: post.updatedAt?.toISOString() || new Date().toISOString(),
      publishedAt: post.publishedAt?.toISOString(),
      eventDate: post.eventDate?.toISOString(),
    };

    // Helper function to clean error messages from text
    const cleanErrorMessage = (text: string | undefined): string => {
      if (!text || typeof text !== "string") return text || "";
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

    // Use translations from metadata if available for current locale
    // ALWAYS use translation from metadata if it exists, regardless of post locale
    // This ensures translations are always used when available
    if (post.metadata) {
      // Always prefer translations from metadata if they exist
      if (post.metadata.titleTranslations?.[locale]) {
        postData.title = cleanErrorMessage(post.metadata.titleTranslations[locale]);
      }
      if (post.metadata.contentTranslations?.[locale]) {
        postData.content = cleanErrorMessage(post.metadata.contentTranslations[locale]);
      }
      if (post.metadata.excerptTranslations?.[locale]) {
        postData.excerpt = cleanErrorMessage(post.metadata.excerptTranslations[locale]);
      }
    }

    // Clean error messages from original content/excerpt as well
    postData.content = cleanErrorMessage(postData.content);
    postData.excerpt = cleanErrorMessage(postData.excerpt);

    // Ensure Montenegrin ("me") is displayed in latinica
    if (locale === "me") {
      postData.title = srCyrToLat(postData.title);
      postData.content = srCyrToLat(postData.content);
      postData.excerpt = srCyrToLat(postData.excerpt || "");
    }

    return postData;
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}

function getBackLink(type: string, locale: Locale, t: any): { href: string; label: string } {
  switch (type) {
    case "news":
      return { href: localeLink("/news", locale), label: t.common.backToNews };
    case "event":
      return { href: localeLink("/", locale), label: t.common.backToHome };
    default:
      return { href: localeLink("/", locale), label: t.common.backToHome };
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  // Handle params as Promise (Next.js 16) or direct object
  const resolvedParams = params instanceof Promise ? await params : params;
  const locale = (resolvedParams.locale as Locale) || "me";
  const t = getTranslations(locale);
  const post = await getPostBySlug(resolvedParams.slug, locale);

  if (!post || post.status !== "published") {
    notFound();
  }

  const backLink = getBackLink(post.type, locale, t);

  const meta: any = (post as any).metadata || {};
  const sourceLocale = ((post as any).locale as Locale) || "me";
  const sourceTitle = (meta?.titleTranslations?.[sourceLocale] || post.title || "").trim();
  const sourceContent = (meta?.contentTranslations?.[sourceLocale] || post.content || "").trim();
  const sourceExcerpt = (meta?.excerptTranslations?.[sourceLocale] || post.excerpt || "").trim();

  const isTranslated = (loc: Locale): boolean => {
    if (loc === sourceLocale) return true;
    const tTitle = (meta?.titleTranslations?.[loc] || "").trim();
    const tContent = (meta?.contentTranslations?.[loc] || "").trim();
    const tExcerpt = (meta?.excerptTranslations?.[loc] || "").trim();
    // Consider translated if any field exists and differs from source (avoid "copied" translations)
    if (tContent && tContent !== sourceContent) return true;
    if (tTitle && tTitle !== sourceTitle) return true;
    if (tExcerpt && tExcerpt !== sourceExcerpt) return true;
    return false;
  };

  function formatDate(dateString?: string | Date, includeTime = false) {
    if (!dateString) return "";
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return "";
    
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    
    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }
    
    return date.toLocaleDateString("en-US", options);
  }

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": post.type === "event" ? "Event" : "Article",
    headline: post.title,
    description: post.excerpt || post.content?.replace(/<[^>]*>/g, "").substring(0, 160),
    ...(post.featuredImage && { image: post.featuredImage }),
    datePublished: post.publishedAt || post.createdAt,
    dateModified: (post as any).updatedAt || post.createdAt,
    author: {
      "@type": "Organization",
      name: "Adriatic Blue Growth Cluster",
    },
    publisher: {
      "@type": "Organization",
      name: "Adriatic Blue Growth Cluster",
      url: "https://southadriaticskills.org",
    },
    ...(post.type === "event" && post.eventDate && {
      startDate: post.eventDate,
      ...(post.eventLocation && {
        location: { "@type": "Place", name: post.eventLocation },
      }),
    }),
  };

  return (
    <main className="container post-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {post._id && <PostViewTracker postId={post._id} />}
      <div className="post-shell">
        <Link href={backLink.href} className="post-back">
          ← {backLink.label}
        </Link>
      </div>

      <div className="post-lang">
        <div className="post-lang-label">Available languages:</div>
        <div className="post-lang-pills">
          {locales.map((l) => {
            const available = isTranslated(l);
            const href = localeLink(`/posts/${post.slug}`, l);
            const active = l === locale;
            const cls =
              "post-lang-pill" +
              (active ? " is-active" : "") +
              (!available ? " is-disabled" : "");
            return (
              <Link
                key={l}
                href={href}
                className={cls}
                title={available ? `Open in ${localeNames[l]}` : `Not translated to ${localeNames[l]} yet`}
              >
                <span>{localeFlagEmojis[l]}</span>
                <span>{localeNames[l]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <article className="post-shell">
        {post.featuredImage && (
          <div className="post-hero">
            <img
              src={post.featuredImage}
              alt={post.title}
            />
          </div>
        )}

        <header className="post-header">
          <h1 className="post-title">{post.title}</h1>
          <div className="post-meta">
            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
            {post.type && <span className="post-type">{post.type}</span>}
            {post.viewCount !== undefined && (
              <span>👁️ {post.viewCount} {post.viewCount === 1 ? "view" : "views"}</span>
            )}
            {post.publishedByName && (
              <span>Published by: <strong>{post.publishedByName}</strong></span>
            )}
          </div>
        </header>

        {post.excerpt && (
          <div
            className="post-excerpt"
            dangerouslySetInnerHTML={{ __html: processPostContent(post.excerpt) }}
          />
        )}

        {post.type === "event" && (post.eventDate || post.eventLocation) && (
          <div className="post-event-box">
            {post.eventDate && (
              <p style={{ margin: "5px 0" }}>
                <strong>Date:</strong> {formatDate(post.eventDate)}
              </p>
            )}
            {post.eventLocation && (
              <p style={{ margin: "5px 0" }}>
                <strong>Location:</strong> {post.eventLocation}
              </p>
            )}
          </div>
        )}

        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: processPostContent(post.content) }}
        />
      </article>
    </main>
  );
}
