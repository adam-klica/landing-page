import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://southadriaticskills.org";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Adriatic Blue Growth Cluster",
    template: "%s | ABGC",
  },
  description:
    "Adriatic Blue Growth Cluster (ABGC) - Connecting maritime professionals, researchers, and organizations across the Adriatic region for sustainable blue economy growth.",
  keywords: [
    "Adriatic",
    "Blue Growth",
    "Cluster",
    "ABGC",
    "maritime",
    "blue economy",
    "Montenegro",
    "South Adriatic",
  ],
  authors: [{ name: "Adriatic Blue Growth Cluster" }],
  openGraph: {
    type: "website",
    siteName: "Adriatic Blue Growth Cluster",
    title: "Adriatic Blue Growth Cluster",
    description:
      "Connecting maritime professionals, researchers, and organizations across the Adriatic region for sustainable blue economy growth.",
    url: BASE_URL,
    images: [
      {
        url: `${BASE_URL}/wp-content/uploads/2025/09/00ad0771c445ce2057c0b8cf1fc2e6dd9b6d84b8-scaled.webp`,
        width: 800,
        height: 600,
        alt: "Adriatic Blue Growth Cluster",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Adriatic Blue Growth Cluster",
    description:
      "Connecting maritime professionals, researchers, and organizations across the Adriatic region.",
    images: [
      `${BASE_URL}/wp-content/uploads/2025/09/00ad0771c445ce2057c0b8cf1fc2e6dd9b6d84b8-scaled.webp`,
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      en: `${BASE_URL}/en`,
      "sr-Latn-ME": `${BASE_URL}/me`,
      it: `${BASE_URL}/it`,
      sq: `${BASE_URL}/sq`,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Middleware will handle redirects to /[locale] before this layout is called
  // [locale]/layout.tsx will provide the actual content structure
  return (
    <html lang="me">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/assets/css/main.css" />
        <link rel="stylesheet" href="/assets/css/admin-responsive.css" />
        <link rel="stylesheet" href="/assets/css/admin-bar.css" />
        <link rel="stylesheet" href="/assets/css/pages/chat-responsive.css" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"
        />
      </head>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        {/* Swiper custom elements (used by <swiper-container/>) */}
        <Script
          src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-element-bundle.min.js"
          strategy="afterInteractive"
        />
        {/* Theme JS (accordion + mobile menu) */}
        <Script src="/assets/js/main.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
