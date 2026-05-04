import { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://southadriaticskills.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/profile/", "/chat/", "/dashboard/", "/login/", "/forgot-password/", "/reset-password/", "/user-profile/", "/connection-requests/", "/search/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
