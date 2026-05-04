import { NewsSection } from "@/components/NewsSection";
import { EventsSection } from "@/components/EventsSection";
import { StatsSection } from "@/components/StatsSection";
import { ChartsSection } from "@/components/ChartsSection";
import { AccordionSection } from "@/components/AccordionSection";
import { getTranslations, type Locale } from "@/lib/getTranslations";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/RegisterForm";
import { PlatformLinksSection } from "@/components/PlatformLinksSection";
import { localeLink } from "@/lib/localeLink";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Adriatic Blue Growth Cluster",
  alternateName: "ABGC",
  url: "https://southadriaticskills.org",
  logo: "https://southadriaticskills.org/wp-content/uploads/2025/09/00ad0771c445ce2057c0b8cf1fc2e6dd9b6d84b8-scaled.webp",
  description:
    "Connecting maritime professionals, researchers, and organizations across the Adriatic region for sustainable blue economy growth.",
  sameAs: ["https://adriaticbgc.org/"],
};

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const locale = (resolvedParams.locale as Locale) || "me";
  const t = getTranslations(locale);
  const user = await getCurrentUser();

  return (
    <main className="site-main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {user ? (
        <>
          <section className="hero">
            <div className="container hero-inner">
              <div className="hero-content" data-aos="fade-left">
                <h1 className="hero-title" data-aos="fade-up">
                  {t.hero.title}
                </h1>
                <p className="hero-subtitle" data-aos="fade-up" data-aos-delay="200">
                  {t.hero.subtitle}
                </p>
              </div>

              <div className="hero-image" data-aos="fade-right">
                <Image
                  src="/wp-content/uploads/2025/09/Hero-image-Mask-group.webp"
                  alt="Hero illustration"
                  width={700}
                  height={700}
                  style={{ width: "100%", height: "auto", maxWidth: "700px" }}
                  priority
                  unoptimized
                />
              </div>
            </div>
          </section>

          <section className="about">
            <div className="container about-inner">
              <div className="about-content" data-aos="fade-right">
                <h2 className="about-title">
                  <Link href="https://southadriaticskills.org/en/about" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                    {t.about.title}
                  </Link>
                </h2>
                <p>{t.about.text1}</p>
                <p>{t.about.text2}</p>
                <p>{t.about.text3}</p>
              </div>

              <div className="about-image" data-aos="fade-left">
                <Image
                  src="/wp-content/uploads/2025/09/00ad0771c445ce2057c0b8cf1fc2e6dd9b6d84b8-scaled.webp"
                  alt="ABGC logo"
                  width={800}
                  height={600}
                  style={{ width: "100%", height: "auto" }}
                  loading="lazy"
                  unoptimized
                />
              </div>
            </div>
          </section>

          <PlatformLinksSection locale={locale} />

          <AccordionSection locale={locale} />

          <NewsSection locale={locale} />
          <EventsSection locale={locale} />
          <StatsSection locale={locale} />
          <ChartsSection locale={locale} />
        </>
      ) : (
        <>
          <section className="hero">
            <div className="container hero-inner">
              <div className="hero-content" data-aos="fade-left">
                <h1 className="hero-title" data-aos="fade-up">
                  {t.welcomeBanner.title}
                </h1>
                <p className="hero-subtitle" data-aos="fade-up" data-aos-delay="200">
                  {t.welcomeBanner.subtitle}
                </p>
              </div>

              <div className="hero-image" data-aos="fade-right">
                <Image
                  src="/wp-content/uploads/2025/09/Hero-image-Mask-group.webp"
                  alt="Hero illustration"
                  width={700}
                  height={700}
                  style={{ width: "100%", height: "auto", maxWidth: "700px" }}
                  priority
                  unoptimized
                />
              </div>
            </div>
          </section>

          <RegisterForm locale={locale} />
          <PlatformLinksSection locale={locale} />
          <section className="about">
            <div className="container about-inner">
              <div className="about-content" data-aos="fade-right">
                <h2 className="about-title">{t.about.title}</h2>
                <p>{t.about.text1}</p>
                <p>{t.about.text2}</p>
                <p>{t.about.text3}</p>
              </div>

              <div className="about-image" data-aos="fade-left">
                <Image
                  src="/wp-content/uploads/2025/09/00ad0771c445ce2057c0b8cf1fc2e6dd9b6d84b8-scaled.webp"
                  alt="ABGC logo"
                  width={800}
                  height={600}
                  style={{ width: "100%", height: "auto" }}
                  loading="lazy"
                  unoptimized
                />
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
