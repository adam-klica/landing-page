import type { Metadata } from "next";
import { AdminBar } from "@/components/AdminBar";
import { AOSInit } from "@/components/AOSInit";
import { ConditionalHeaderFooter } from "@/components/ConditionalHeaderFooter";
import { ActivityTracker } from "@/components/ActivityTracker";
import { VisitorTracker } from "@/components/VisitorTracker";
import { locales, defaultLocale, localeNames, localeHreflang, type Locale } from "@/lib/i18n";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://southadriaticskills.org";

const localeDescriptions: Record<Locale, string> = {
  en: "Connecting maritime professionals, researchers, and organizations across the Adriatic region for sustainable blue economy growth.",
  me: "Povezivanje pomorskih profesionalaca, istraživača i organizacija širom Jadranskog regiona za održivi rast plave ekonomije.",
  it: "Collegamento di professionisti marittimi, ricercatori e organizzazioni nella regione adriatica per la crescita sostenibile dell'economia blu.",
  sq: "Lidhja e profesionistëve detarë, studiuesve dhe organizatave në rajonin e Adriatikut për rritjen e qëndrueshme të ekonomisë blu.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: loc } = await params;
  const locale = (loc as Locale) || defaultLocale;
  const description = localeDescriptions[locale] || localeDescriptions.en;

  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[localeHreflang[l]] = `${BASE_URL}/${l}`;
  }

  return {
    title: "Adriatic Blue Growth Cluster",
    description,
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages,
    },
    openGraph: {
      title: "Adriatic Blue Growth Cluster",
      description,
      url: `${BASE_URL}/${locale}`,
      locale: locale === "me" ? "sr_Latn_ME" : locale,
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = (resolvedParams.locale as Locale) || defaultLocale;

  return (
    <>
      <ActivityTracker />
      <VisitorTracker />
      <AdminBar />
      <div id="main-content">
        <ConditionalHeaderFooter>
          {children}
        </ConditionalHeaderFooter>
      </div>

      {/* AOS */}
      <AOSInit />
    </>
  );
}
