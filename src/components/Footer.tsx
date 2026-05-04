"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { MessageCircle } from "lucide-react";
import { localeLink, type Locale } from "@/lib/localeLink";
import { getTranslations } from "@/lib/getTranslations";

export function Footer() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);
  const unreadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extract locale from pathname
  const locale: Locale = (() => {
    const match = pathname?.match(/^\/([^\/]+)/);
    if (match && ["me", "en", "it", "sq"].includes(match[1])) {
      return match[1] as Locale;
    }
    return "me";
  })();
  const t = getTranslations(locale);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  // Load unread counts when user is logged in
  useEffect(() => {
    if (user) {
      loadUnreadCounts();
      // Poll for new messages every 3 seconds
      unreadIntervalRef.current = setInterval(() => {
        loadUnreadCounts();
      }, 3000);

      return () => {
        if (unreadIntervalRef.current) {
          clearInterval(unreadIntervalRef.current);
        }
      };
    } else {
      setTotalUnread(0);
      if (unreadIntervalRef.current) {
        clearInterval(unreadIntervalRef.current);
      }
    }
  }, [user]);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadUnreadCounts() {
    try {
      const res = await fetch("/api/messages/unread");
      if (res.ok) {
        const data = await res.json();
        // Calculate total unread messages
        let total = 0;
        if (data.users) {
          total += Object.values(data.users).reduce((sum: number, count: any) => sum + count, 0);
        }
        if (data.groups) {
          total += Object.values(data.groups).reduce((sum: number, count: any) => sum + count, 0);
        }
        setTotalUnread(total);
      }
    } catch (error) {
      console.error("Error loading unread counts:", error);
    }
  }

  return (
    <>
      <footer className="site-footer">
        <div className="footer-top container">
          <div className="footer-left">
            <Link href={localeLink("/", locale)} className="site-title" style={{ display: "block" }}>
              <img
                src="/wp-content/uploads/2025/09/logo header.png"
                alt="Adriatic Blue Growth Cluster"
                style={{ height: "70px", width: "auto", objectFit: "contain" }}
              />
            </Link>
          </div>

          <div className="footer-center" style={{
            flex: "1",
            maxWidth: "600px",
            margin: "0 40px",
            padding: "40px 0",
            fontSize: "12px",
            lineHeight: "1.5",
            color: "#666",
            textAlign: "center"
          }}>
            {/* EU Disclaimer */}
            <p style={{ margin: 0 }}>
              {t.contact.euDisclaimer}
            </p>
          </div>

          <div className="footer-right">
            <nav className="footer-nav">
              <ul>
                <li>
                  <Link href={localeLink("/contact", locale)} className="footer-link">{t.common.contact}</Link>
                </li>
                <li>
                  <a href={locale === "en" ? "/users-guide.html" : `/users-guide-${locale}.html`} target="_blank" rel="noopener" className="footer-link">{t.common.usersGuide || "Users Guide"}</a>
                </li>
                <li>
                  <Link href={localeLink("/terms", locale)} className="footer-link">{t.contact.privacyPolicy}</Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="footer-bottom" style={{
          background: "linear-gradient(to right, #B53251, #E23F65)",
          textAlign: "center",
          padding: "20px",
          color: "#fff"
        }}>
          <p style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#fff",
            margin: "0",
            textAlign: "center"
          }}>
            {t.footer.copyright}
          </p>
        </div>
      </footer>

      {/* Floating Chat Button - Always visible when user is logged in */}
      {!loading && user && (
        <div
          id="chat-widget"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 9999,
            display: "block",
            visibility: "visible",
            opacity: 1,
          }}
        >
          <Link
            href={localeLink("/chat", locale)}
            title={t.common.chat || "Chat"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "60px",
              height: "60px",
              backgroundColor: "#0073e6",
              color: "#fff",
              borderRadius: "50%",
              textDecoration: "none",
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
              transition: "background-color 0.3s ease, transform 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#005bb5";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0073e6";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <MessageCircle size={28} />
          </Link>
          {totalUnread > 0 && (
            <span
              className="unread-badge"
              style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                background: "#e63946",
                color: "#fff",
                fontSize: "12px",
                fontWeight: "bold",
                borderRadius: "50%",
                padding: "4px 7px",
                minWidth: "20px",
                height: "20px",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(230, 57, 70, 0.4)",
                border: "2px solid #fff",
                lineHeight: "1",
                zIndex: 10000,
              }}
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>
      )}
    </>
  );
}

