import { type Locale } from "./i18n";

// Re-export Locale type for convenience
export type { Locale };

/**
 * Helper function to create locale-aware links
 * @param path - Path without locale (e.g., "/about", "/posts/slug", "/chat?userId=123")
 * @param locale - Current locale
 * @returns Path with locale prefix (e.g., "/me/about", "/en/posts/slug", "/me/chat?userId=123")
 */
export function localeLink(path: string, locale: Locale): string {
  // Guard against invalid input
  if (!path || typeof path !== "string") {
    console.warn("localeLink: Invalid path provided", path);
    return `/${locale || "me"}`;
  }
  
  // Split path and query string
  const [pathPart, queryPart] = path.split("?");
  
  // Guard against invalid pathPart
  if (!pathPart || typeof pathPart !== "string") {
    console.warn("localeLink: Invalid pathPart", pathPart);
    return `/${locale || "me"}`;
  }
  
  // Remove leading slash if present
  const cleanPath = pathPart.startsWith("/") ? pathPart.slice(1) : pathPart;
  
  // Don't add locale to API routes, admin routes, or external URLs
  if (cleanPath.startsWith("api/") || cleanPath.startsWith("admin/") || cleanPath.startsWith("http")) {
    return path;
  }
  
  // Reconstruct path with locale and query string
  const localePath = `/${locale}/${cleanPath}`;
  return queryPart ? `${localePath}?${queryPart}` : localePath;
}
