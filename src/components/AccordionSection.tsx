"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { getTranslations, type Locale } from "@/lib/getTranslations";

interface AccordionSectionProps {
  locale?: Locale;
}

export function AccordionSection({ locale }: AccordionSectionProps) {
  const [activeTab, setActiveTab] = useState("tab1");
  const pathname = usePathname();
  
  // Extract locale from pathname if not provided
  const currentLocale: Locale = locale || (() => {
    const match = pathname?.match(/^\/([^\/]+)/);
    if (match && ["me", "en", "it", "sq"].includes(match[1])) {
      return match[1] as Locale;
    }
    return "me";
  })();
  
  const t = getTranslations(currentLocale);

  return (
    <section className="accordion-section">
      <div className="container accordion-inner">
        <div className="accordion-nav" data-aos="fade-right">
          <button
            className={`accordion-tab ${activeTab === "tab1" ? "active" : ""}`}
            onClick={() => setActiveTab("tab1")}
            type="button"
          >
            <img
              src="/wp-content/uploads/2025/09/waypoints.webp"
              alt="Cluster Organisations icon"
            />
            {t.accordion.cluster}
          </button>
          <button
            className={`accordion-tab ${activeTab === "tab2" ? "active" : ""}`}
            onClick={() => setActiveTab("tab2")}
            type="button"
          >
            <img
              src="/wp-content/uploads/2025/09/handshake.webp"
              alt="Policy Support icon"
            />
            {t.accordion.policy}
          </button>
          <button
            className={`accordion-tab ${activeTab === "tab3" ? "active" : ""}`}
            onClick={() => setActiveTab("tab3")}
            type="button"
          >
            <img
              src="/wp-content/uploads/2025/09/siren.webp"
              alt="Partnership Opportunities icon"
            />
            {t.accordion.partnership}
          </button>
        </div>

        <div className="accordion-content" data-aos="fade-left">
          <div
            className={`accordion-panel ${activeTab === "tab1" ? "active" : ""}`}
            id="tab1"
          >
            <img
              src="/wp-content/uploads/2025/09/waypoints.webp"
              alt="Cluster Organisations illustration"
              style={{ maxWidth: "100%", height: "auto" }}
            />
            <h2>{t.accordion.cluster}</h2>
            <p>{t.accordion.clusterText1}</p>
            <p>
              <strong>South Adriatic Cluster</strong> {t.accordion.clusterText2}
            </p>
            <p>
              <strong>South and Central Adriatic Cluster</strong> {t.accordion.clusterText3}
            </p>
            <p>{t.accordion.clusterText4}</p>
          </div>

          <div
            className={`accordion-panel ${activeTab === "tab2" ? "active" : ""}`}
            id="tab2"
          >
            <img
              src="/wp-content/uploads/2025/09/handshake.webp"
              alt="Policy Support illustration"
              style={{ maxWidth: "100%", height: "auto" }}
            />
            <h2>{t.accordion.policy}</h2>
            <p>{t.accordion.policyText1}</p>
            <p>{t.accordion.policyText2}</p>
          </div>

          <div
            className={`accordion-panel ${activeTab === "tab3" ? "active" : ""}`}
            id="tab3"
          >
            <img
              src="/wp-content/uploads/2025/09/siren.webp"
              alt="Partnership Opportunities illustration"
              style={{ maxWidth: "100%", height: "auto" }}
            />
            <h2>{t.accordion.partnership}</h2>
            <p>{t.accordion.partnershipText1}</p>
            <p>{t.accordion.partnershipText2}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
