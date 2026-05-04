import { MetadataRoute } from "next";
import { locales, type Locale } from "@/lib/i18n";
import { getCollection } from "@/lib/db";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://southadriaticskills.org";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages per locale
  const staticPages = ["", "/about", "/contact", "/news", "/events", "/terms"];

  for (const locale of locales) {
    for (const page of staticPages) {
      const alternates: Record<string, string> = {};
      for (const l of locales) {
        alternates[l] = `${BASE_URL}/${l}${page}`;
      }

      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === "" ? "daily" : "weekly",
        priority: page === "" ? 1.0 : 0.8,
        alternates: { languages: alternates },
      });
    }
  }

  // Dynamic post pages
  try {
    const collection = await getCollection("posts");
    const posts = await collection
      .find({ status: "published" })
      .project({ slug: 1, updatedAt: 1, type: 1 })
      .toArray();

    for (const post of posts) {
      const alternates: Record<string, string> = {};
      for (const l of locales) {
        alternates[l] = `${BASE_URL}/${l}/posts/${post.slug}`;
      }

      entries.push({
        url: `${BASE_URL}/en/posts/${post.slug}`,
        lastModified: post.updatedAt || new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: { languages: alternates },
      });
    }
  } catch (error) {
    console.error("Error generating sitemap posts:", error);
  }

  // Static HTML user guides (one per language)
  const guideUrls = [
    "/users-guide.html",
    "/users-guide-me.html",
    "/users-guide-it.html",
    "/users-guide-sq.html",
  ];
  for (const guidePath of guideUrls) {
    entries.push({
      url: `${BASE_URL}${guidePath}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
