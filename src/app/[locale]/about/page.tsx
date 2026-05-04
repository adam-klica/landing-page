"use client";

import { usePathname } from "next/navigation";
import { getTranslations, type Locale } from "@/lib/getTranslations";

export default function AboutPage() {
  const pathname = usePathname();
  const locale: Locale = (() => {
    const match = pathname?.match(/^\/([^\/]+)/);
    if (match && ["me", "en", "it", "sq"].includes(match[1])) {
      return match[1] as Locale;
    }
    return "en";
  })();
  const t = getTranslations(locale);

  return (
    <main className="about-page">
      <div className="container about-header" data-aos="fade-up">
        <div className="about-logo" data-aos="fade-right">
          <img
            src="/wp-content/uploads/2025/09/00ad0771c445ce2057c0b8cf1fc2e6dd9b6d84b8-scaled.webp"
            alt="ABGC Logo"
          />
        </div>
        <div className="about-text" data-aos="fade-left" data-aos-delay="200">
          <h3>{t.about.pageTitle}</h3>
          <p>{t.about.pageDescription1}</p>
          <p>{t.about.pageDescription2}</p>
        </div>
      </div>

      <div className="container about-cards">
        <div className="card" data-aos="zoom-in" data-aos-delay="100">
          <h4>{t.about.whatWeDo}</h4>
          <ul>
            <li>{t.about.whatWeDoItem1}</li>
            <li>{t.about.whatWeDoItem2}</li>
            <li>{t.about.whatWeDoItem3}</li>
            <li>{t.about.whatWeDoItem4}</li>
            <li>{t.about.whatWeDoItem5}</li>
          </ul>
        </div>

        <div className="card" data-aos="zoom-in" data-aos-delay="200">
          <h4>{t.about.ourStructure}</h4>
          <p>{t.about.ourStructureText}</p>
          <ul>
            <li>
              <strong>
                {t.about.ourStructureItem1.split("—")[0]}—{" "}
                <a 
                  href="https://adriaticbgc.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: "#E23F65", textDecoration: "none" }}
                >
                  {t.about.ourStructureItem1.split("—")[1]}
                </a>
              </strong>
            </li>
            <li>
              <strong>{t.about.ourStructureItem2}</strong>
            </li>
          </ul>
        </div>

        <div className="card" data-aos="zoom-in" data-aos-delay="300">
          <h4>{t.about.whoCanJoin}</h4>
          <ul>
            <li>{t.about.whoCanJoinItem1}</li>
            <li>{t.about.whoCanJoinItem2}</li>
            <li>{t.about.whoCanJoinItem3}</li>
            <li>{t.about.whoCanJoinItem4}</li>
          </ul>
        </div>

        <div className="card" data-aos="zoom-in" data-aos-delay="400">
          <h4>{t.about.whyJoin}</h4>
          <ul>
            <li>{t.about.whyJoinItem1}</li>
            <li>{t.about.whyJoinItem2}</li>
            <li>{t.about.whyJoinItem3}</li>
            <li>{t.about.whyJoinItem4}</li>
            <li>{t.about.whyJoinItem5}</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
