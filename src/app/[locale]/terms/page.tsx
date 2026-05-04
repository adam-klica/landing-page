"use client";

import { usePathname } from "next/navigation";
import { getTranslations, type Locale } from "@/lib/getTranslations";

export default function TermsPage() {
  const pathname = usePathname();
  const locale: Locale = (() => {
    const match = pathname?.match(/^\/([^\/]+)/);
    if (match && ["me", "en", "it", "sq"].includes(match[1])) {
      return match[1] as Locale;
    }
    return "me";
  })();
  const t = getTranslations(locale);

  return (
    <main className="terms-page" style={{
      padding: "40px 0",
      minHeight: "calc(100vh - 200px)"
    }}>
      <div className="container" style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "0 20px"
      }}>
        <h1 style={{
          fontSize: "36px",
          fontWeight: "700",
          color: "#B53251",
          marginBottom: "10px",
          textAlign: "center"
        }}>
          {t.terms.title}
        </h1>
        <p style={{
          fontSize: "18px",
          color: "#666",
          textAlign: "center",
          marginBottom: "40px"
        }}>
          {t.terms.subtitle}
        </p>

        <div style={{
          background: "#fff",
          padding: "40px",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          lineHeight: "1.8",
          fontSize: "16px"
        }}>
          <section style={{ marginBottom: "40px" }}>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#B53251",
              marginBottom: "20px",
              borderBottom: "2px solid #E23F65",
              paddingBottom: "10px"
            }}>
              {t.terms.section1.title}
            </h2>
            <p style={{ marginBottom: "15px", color: "#333" }}>
              {t.terms.section1.text1}
            </p>
            <p style={{ color: "#333" }}>
              {t.terms.section1.text2}
            </p>
          </section>

          <section style={{ marginBottom: "40px" }}>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#B53251",
              marginBottom: "20px",
              borderBottom: "2px solid #E23F65",
              paddingBottom: "10px"
            }}>
              {t.terms.section2.title}
            </h2>
            <p style={{ marginBottom: "15px", color: "#333" }}>
              {t.terms.section2.text}
            </p>
            <ul style={{
              listStyle: "disc",
              paddingLeft: "30px",
              marginTop: "15px",
              color: "#333"
            }}>
              <li style={{ marginBottom: "10px" }}>{t.terms.section2.item1}</li>
              <li style={{ marginBottom: "10px" }}>{t.terms.section2.item2}</li>
              <li style={{ marginBottom: "10px" }}>{t.terms.section2.item3}</li>
              <li style={{ marginBottom: "10px" }}>{t.terms.section2.item4}</li>
            </ul>
          </section>

          <section style={{ marginBottom: "40px" }}>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#B53251",
              marginBottom: "20px",
              borderBottom: "2px solid #E23F65",
              paddingBottom: "10px"
            }}>
              {t.terms.section3.title}
            </h2>
            <p style={{ marginBottom: "15px", color: "#333" }}>
              {t.terms.section3.text}
            </p>
            <ul style={{
              listStyle: "disc",
              paddingLeft: "30px",
              marginTop: "15px",
              color: "#333"
            }}>
              <li style={{ marginBottom: "10px" }}>{t.terms.section3.item1}</li>
              <li style={{ marginBottom: "10px" }}>{t.terms.section3.item2}</li>
              <li style={{ marginBottom: "10px" }}>{t.terms.section3.item3}</li>
              <li style={{ marginBottom: "10px" }}>{t.terms.section3.item4}</li>
            </ul>
          </section>

          <section style={{ marginBottom: "40px" }}>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#B53251",
              marginBottom: "20px",
              borderBottom: "2px solid #E23F65",
              paddingBottom: "10px"
            }}>
              {t.terms.section4.title}
            </h2>
            <p style={{ marginBottom: "15px", color: "#333" }}>
              {t.terms.section4.text}
            </p>
            <ul style={{
              listStyle: "disc",
              paddingLeft: "30px",
              marginTop: "15px",
              color: "#333"
            }}>
              <li style={{ marginBottom: "10px" }}>{t.terms.section4.item1}</li>
              <li style={{ marginBottom: "10px" }}>{t.terms.section4.item2}</li>
              <li style={{ marginBottom: "10px" }}>{t.terms.section4.item3}</li>
            </ul>
            <p style={{ marginTop: "15px", color: "#333" }}>
              {t.terms.section4.text2}
            </p>
          </section>

          <section style={{ marginBottom: "40px" }}>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#B53251",
              marginBottom: "20px",
              borderBottom: "2px solid #E23F65",
              paddingBottom: "10px"
            }}>
              {t.terms.section5.title}
            </h2>
            <p style={{ marginBottom: "15px", color: "#333" }}>
              {t.terms.section5.text}
            </p>
            <ul style={{
              listStyle: "disc",
              paddingLeft: "30px",
              marginTop: "15px",
              color: "#333"
            }}>
              <li style={{ marginBottom: "10px" }}>{t.terms.section5.item1}</li>
              <li style={{ marginBottom: "10px" }}>{t.terms.section5.item2}</li>
              <li style={{ marginBottom: "10px" }}>{t.terms.section5.item3}</li>
            </ul>
            <p style={{ marginTop: "15px", color: "#333" }}>
              {t.terms.section5.text2}
            </p>
          </section>

          <section style={{ marginBottom: "40px" }}>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#B53251",
              marginBottom: "20px",
              borderBottom: "2px solid #E23F65",
              paddingBottom: "10px"
            }}>
              {t.terms.section6.title}
            </h2>
            <p style={{ marginBottom: "15px", color: "#333" }}>
              {t.terms.section6.text1}
            </p>
            <p style={{ color: "#333" }}>
              {t.terms.section6.text2}
            </p>
          </section>

          <section style={{ marginBottom: "40px" }}>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#B53251",
              marginBottom: "20px",
              borderBottom: "2px solid #E23F65",
              paddingBottom: "10px"
            }}>
              {t.terms.section7.title}
            </h2>
            <p style={{ color: "#333" }}>
              {t.terms.section7.text}
            </p>
          </section>

          <section style={{ marginBottom: "40px" }}>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#B53251",
              marginBottom: "20px",
              borderBottom: "2px solid #E23F65",
              paddingBottom: "10px"
            }}>
              {t.terms.section8.title}
            </h2>
            <p style={{ marginBottom: "15px", color: "#333" }}>
              {t.terms.section8.text1}
            </p>
            <p style={{ color: "#333" }}>
              {t.terms.section8.text2}
            </p>
          </section>

          <section style={{
            background: "#f8f9fa",
            padding: "30px",
            borderRadius: "8px",
            border: "1px solid #E23F65"
          }}>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "#B53251",
              marginBottom: "20px",
              borderBottom: "2px solid #E23F65",
              paddingBottom: "10px"
            }}>
              {t.terms.section9.title}
            </h2>
            <p style={{ marginBottom: "15px", color: "#333" }}>
              {t.terms.section9.text}
            </p>
            <p style={{ marginBottom: "10px", color: "#333" }}>
              <strong>{t.terms.section9.emailLabel}:</strong>{" "}
              <a 
                href="mailto:info@adriaticbgc.org" 
                style={{ color: "#E23F65", textDecoration: "none" }}
              >
                info@adriaticbgc.org
              </a>
            </p>
            <p style={{ color: "#333" }}>
              <strong>{t.terms.section9.websiteLabel}:</strong>{" "}
              <a 
                href="https://southadriaticskills.org/me" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: "#E23F65", textDecoration: "none" }}
              >
                https://southadriaticskills.org/me
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
