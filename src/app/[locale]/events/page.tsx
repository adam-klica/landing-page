import type { Metadata } from "next";
import { Post } from "@/models/Post";
import Link from "next/link";
import { locales, localeHreflang, type Locale } from "@/lib/i18n";
import { localeLink } from "@/lib/localeLink";
import { getCollection } from "@/lib/db";
import { getTranslations } from "@/lib/getTranslations";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://southadriaticskills.org";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: loc } = await params;
  const locale = (loc as Locale) || "en";
  const t = getTranslations(locale);
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[localeHreflang[l]] = `${BASE_URL}/${l}/events`;
  }
  return {
    title: t.eventsPage.title,
    description: `Upcoming events from the Adriatic Blue Growth Cluster.`,
    alternates: { canonical: `${BASE_URL}/${locale}/events`, languages },
    openGraph: {
      title: t.eventsPage.title,
      description: `Upcoming events from the Adriatic Blue Growth Cluster.`,
      url: `${BASE_URL}/${locale}/events`,
    },
  };
}

async function getEvents(locale: Locale, page: number = 1, limit: number = 50) {
  try {
    const collection = await getCollection("posts");
    
    // Get all published event posts (regardless of locale)
    // We'll use translations from metadata to display in current locale
    const query: any = {
      type: "event",
      status: "published",
    };
    
    const skip = (page - 1) * limit;
    
    const [posts, total] = await Promise.all([
      collection
        .find(query)
        .sort({ eventDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    console.log(`[Events] Found ${posts.length} published event posts (page ${page}, total: ${total})`);

    return {
      posts: posts.map((post) => {
        const postData: Post = {
          ...post,
          _id: post._id.toString(),
          type: post.type || "event",
          title: post.title || "",
          slug: post.slug || "",
          content: post.content || "",
          status: post.status || "draft",
          createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: post.updatedAt?.toISOString() || new Date().toISOString(),
          publishedAt: post.publishedAt?.toISOString(),
          eventDate: post.eventDate?.toISOString(),
        };

        // Always prefer translations from metadata if available for the current locale.
        // (Existing posts may have wrong/missing `post.locale`, so don't depend on it.)
        if (post.metadata?.titleTranslations?.[locale]) {
          postData.title = post.metadata.titleTranslations[locale];
        }
        if (post.metadata?.contentTranslations?.[locale]) {
          postData.content = post.metadata.contentTranslations[locale];
        }
        if (post.metadata?.excerptTranslations?.[locale]) {
          postData.excerpt = post.metadata.excerptTranslations[locale];
        }

        return postData;
      }) as Post[],
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching events:", error);
    return {
      posts: [] as Post[],
      pagination: {
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      },
    };
  }
}

function formatDate(dateValue?: string | Date) {
  if (!dateValue) return "";
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const locale = (resolvedParams.locale as Locale) || "me";
  const page = parseInt(resolvedSearchParams.page || "1", 10);
  const t = getTranslations(locale);
  
  const { posts, pagination } = await getEvents(locale, page, 50);

  return (
    <main className="blog-archive container">
      <h2 data-aos="fade-up" className="page-title">
        {t.eventsPage.title}
      </h2>

      <div className="news-grid" style={{ marginBottom: "40px" }}>
        {posts.length > 0 ? (
          posts.map((post: Post, index: number) => (
            <div
              key={post._id}
              className="news-item"
              data-aos="fade-up"
              data-aos-delay={(index % 4) * 100 + 100}
            >
              {post.featuredImage && (
                <Link href={localeLink(`/posts/${post.slug}`, locale)}>
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="news-thumb"
                  />
                </Link>
              )}

              <div className="news-meta">
                <span className="news-date">
                  {formatDate(post.eventDate || post.publishedAt || post.createdAt)}
                </span>
              </div>
              
              <h3 className="news-item-title">
                <Link href={localeLink(`/posts/${post.slug}`, locale)}>{post.title}</Link>
              </h3>

              <div className="news-button-wrapper">
                <Link href={localeLink(`/posts/${post.slug}`, locale)} className="news-button">
                  {t.eventsPage.readMore}
                </Link>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">
            {t.eventsPage.noPostsFound}
          </p>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          baseUrl={localeLink("/events", locale)}
        />
      )}
    </main>
  );
}
