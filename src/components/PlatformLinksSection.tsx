"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTranslations, type Locale } from "@/lib/getTranslations";
import { localeLink } from "@/lib/localeLink";

interface PlatformLinksSectionProps {
  locale: Locale;
}

export function PlatformLinksSection({ locale }: PlatformLinksSectionProps) {
  const t = getTranslations(locale);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  }

  const handlePlatformClick = (platform: { id: string; url: string }) => {
    // Special handling for eCommunication
    if (platform.id === "ecommunication") {
      if (user) {
        // User is logged in - go to search page
        router.push(localeLink("/search", locale));
      } else {
        // User is not logged in - go to landing page (homepage)
        router.push(localeLink("/", locale));
      }
      return;
    }
    // For other platforms, open in new tab
    if (platform.url && platform.url !== "#") {
      window.open(platform.url, "_blank", "noopener,noreferrer");
    }
  };

  const platforms = [
    {
      id: "ecommunication",
      label: t.platform.ecommunication,
      image: "/wp-content/uploads/2025/09/viber_image_2026-02-18_19-35-06-493.png",
      url: "#", // TODO: Add eCommunication URL
    },
    {
      id: "dms",
      label: t.platform.documents,
      image: "/wp-content/uploads/2025/09/Frame-10000022262.webp",
      url: "https://info.southadriaticskills.org",
    },
    {
      id: "lms",
      label: t.platform.elearning,
      image: "/wp-content/uploads/2025/09/Frame-1000002235.webp",
      url: "http://edu.southadriaticskills.org",
    },
    {
      id: "ecommerce",
      label: t.platform.ecommerce,
      image: "/wp-content/uploads/2025/09/Frame-1000002234.webp",
      url: "https://market.southadriaticskills.org",
    },
  ];

  if (loading) {
    return null; // Don't show anything while loading
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .platform-grid {
          grid-template-columns: repeat(4, 1fr) !important;
        }
        @media (max-width: 1200px) {
          .platform-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          .platform-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
          }
          .platform-card {
            padding: 30px 20px !important;
          }
          .platform-card img {
            max-height: 150px !important;
          }
        }
        @media (max-width: 480px) {
          .platform-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .platform-section {
            padding: 60px 15px !important;
          }
          .platform-card {
            padding: 25px 15px !important;
          }
        }
      `}} />
    <section className="platform platform-section" style={{
      padding: "100px 20px",
      background: "linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(234,243,250,0.75) 100%)",
      textAlign: "center"
    }}>
      <div className="container" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{
          fontSize: "clamp(28px, 4vw, 42px)",
          fontWeight: "700",
          color: "#52484C",
          marginBottom: "60px",
          lineHeight: "1.3"
        }} data-aos="fade-up">
          {t.platform.title}
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "30px",
          maxWidth: "1400px",
          margin: "0 auto"
        }}
        className="platform-grid"
        >
          {platforms.map((platform, index) => (
            <div
              key={platform.id}
              className="platform-card"
              data-aos="zoom-in"
              data-aos-delay={(index + 1) * 100}
              onClick={() => handlePlatformClick(platform)}
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "40px 30px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                border: "1px solid rgba(0,0,0,0.05)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.15)";
                e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "rgba(0,0,0,0.05)";
              }}
            >
              <div style={{
                width: "100%",
                height: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "24px",
                overflow: "hidden",
                borderRadius: "12px",
                padding: "20px"
              }}>
                <img 
                  src={platform.image} 
                  alt={platform.label}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    transition: "transform 0.3s ease",
                    width: "auto",
                    height: "auto"
                  }}
                />
              </div>
              <h3 style={{
                fontSize: "22px",
                fontWeight: "600",
                color: "#52484C",
                margin: 0,
                lineHeight: "1.4"
              }}>
                {platform.label}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}
