import { Post } from "@/models/Post";
import { getTranslations, type Locale } from "@/lib/getTranslations";
import { getCollection } from "@/lib/db";
import { PostsCarousel } from "./PostsCarousel";

async function getUpcomingEvents(locale: Locale) {
  try {
    // Directly query database instead of HTTP request for better performance and reliability
    const collection = await getCollection("posts");

    // Get all published event posts (regardless of locale)
    // We'll use translations from metadata to display in current locale
    const posts = await collection
      .find({
        type: "event",
        status: "published",
      })
      .sort({ eventDate: -1, createdAt: -1 })
      .toArray();

    return posts.map((post) => {
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
    }) as Post[];
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

interface EventsSectionProps {
  locale?: Locale;
}

export async function EventsSection({ locale = "en" }: EventsSectionProps) {
  const posts = await getUpcomingEvents(locale);
  const t = getTranslations(locale);

  return (
    <section className="events">
      <div className="container">
        <h2 className="events-title" data-aos="fade-up">
          {t.events.title}
        </h2>
        <p className="events-subtitle" data-aos="fade-up" data-aos-delay="150">
          {t.events.subtitle}
        </p>

        <div data-aos="fade-up">
          <PostsCarousel
            posts={posts}
            locale={locale}
            readMoreLabel={t.events.readMore}
            dateField="eventDate"
          />
        </div>
      </div>
    </section>
  );
}
