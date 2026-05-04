export interface Post {
  _id?: string;
  type: "news" | "event";
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  status: "draft" | "published";
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Event specific fields
  eventDate?: Date;
  eventLocation?: string;
  // Language/locale
  locale?: string;
  // View tracking
  viewCount?: number;
  // Publisher info
  publishedBy?: string; // User ID who published the post
  publishedByName?: string; // Display name of publisher
  // Additional metadata (includes translations)
  metadata?: {
    titleTranslations?: Record<string, string>;
    contentTranslations?: Record<string, string>;
    excerptTranslations?: Record<string, string>;
    [key: string]: any;
  };
}
