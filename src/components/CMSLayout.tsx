"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTranslations } from "@/lib/getTranslations";
import { defaultLocale, locales, localeNames, localeFlags, type Locale } from "@/lib/i18n";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { getStoredCmsLocale } from "@/lib/cmsLocale";

interface CMSLayoutProps {
  children: React.ReactNode;
  locale?: Locale;
}

export function CMSLayout({ children, locale: propLocale }: CMSLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [cmsLocale, setCmsLocale] = useState<Locale>(defaultLocale);
  const [localeInitialized, setLocaleInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load locale from localStorage on mount
  useEffect(() => {
    const savedLocale = getStoredCmsLocale();
    if (savedLocale && locales.includes(savedLocale)) {
      setCmsLocale(savedLocale);
    } else if (propLocale) {
      setCmsLocale(propLocale);
    }
    setLocaleInitialized(true);
  }, [propLocale]);

  // Save locale to localStorage when it changes
  useEffect(() => {
    if (!localeInitialized) return;
    localStorage.setItem("cms-locale", cmsLocale);
  }, [cmsLocale, localeInitialized]);

  // Fetch current user - cache in sessionStorage to avoid repeated calls
  useEffect(() => {
    async function fetchUser() {
      try {
        // Check cache first
        const cachedUser = sessionStorage.getItem("cms-current-user");
        if (cachedUser) {
          try {
            const user = JSON.parse(cachedUser);
            const cacheTime = user._cacheTime || 0;
            // Cache for 5 minutes
            if (Date.now() - cacheTime < 5 * 60 * 1000) {
              setCurrentUser(user);
              return;
            }
          } catch (e) {
            // Invalid cache, continue to fetch
          }
        }

        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            // Cache user data
            const userWithCache = { ...data.user, _cacheTime: Date.now() };
            sessionStorage.setItem("cms-current-user", JSON.stringify(userWithCache));
            setCurrentUser(data.user);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    }
    fetchUser();
  }, []);

  // Check if mobile
  useEffect(() => {
    function checkMobile() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    }
    // Check immediately
    checkMobile();
    // Also check after a short delay to ensure window is available
    const timeout = setTimeout(checkMobile, 100);
    window.addEventListener("resize", checkMobile);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const t = getTranslations(cmsLocale);

  const menuItems = [
    {
      title: t.cms.dashboard,
      icon: "📊",
      href: "/admin",
      exact: true,
    },
    {
      title: t.cms.posts,
      icon: "📝",
      children: [
        { title: t.cms.news, href: "/admin/posts?type=news" },
        { title: t.cms.events, href: "/admin/posts?type=event" },
      ],
    },
    {
      title: t.cms.users,
      icon: "👥",
      href: "/admin/users",
    },
    {
      title: t.cms.media,
      icon: "🖼️",
      href: "/admin/media",
    },
    {
      title: t.cms.settings,
      icon: "⚙️",
      href: "/admin/settings",
    },
  ];

  function isActive(href: string, exact?: boolean) {
    if (exact) {
      return pathname === href;
    }
    // Handle query params in href
    const hrefPath = href.split("?")[0];
    return pathname?.startsWith(hrefPath);
  }

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [pathname, isMobile]);

  return (
    <div className="cms-wrapper">
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="cms-mobile-menu-btn"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="cms-mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <div
        className={`cms-sidebar ${isMobile ? (mobileMenuOpen ? "cms-sidebar-open" : "") : (sidebarOpen ? "" : "cms-sidebar-collapsed")}`}
        style={{
          width: isMobile 
            ? "280px"
            : (sidebarOpen ? "240px" : "64px"),
        }}
      >
        {/* User Avatar Section */}
        {(sidebarOpen || isMobile) && currentUser && (
          <div className="cms-user-section">
            <div
              className="cms-user-avatar"
              style={{
                background: currentUser.profilePicture
                  ? `url(${currentUser.profilePicture})`
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              {!currentUser.profilePicture && (
                <span>
                  {currentUser.displayName?.[0]?.toUpperCase() ||
                    currentUser.username?.[0]?.toUpperCase() ||
                    "A"}
                </span>
              )}
            </div>
            <div className="cms-user-info">
              <div className="cms-user-name">
                {currentUser.displayName || currentUser.username || t.cms.administrator}
              </div>
              <div className="cms-user-role">
                {currentUser.role === "admin" ? t.cms.administrator : t.cms.userRole}
              </div>
            </div>
          </div>
        )}

        <div className="cms-menu">
          {menuItems.map((item, index) => (
            <div key={index}>
              {item.children ? (
                <div>
                  <div className="cms-menu-item" style={{ cursor: "default" }}>
                    <span className="cms-menu-icon">{item.icon}</span>
                    {(sidebarOpen || isMobile) && <span className="cms-menu-title">{item.title}</span>}
                  </div>
                  {(sidebarOpen || isMobile) && (
                    <div className="cms-submenu">
                      {item.children.map((child, childIndex) => {
                        const childPath = child.href.split("?")[0];
                        const isChildActive = pathname === childPath || 
                          (child.href.includes("?type=") && pathname?.startsWith("/admin/posts"));
                        return (
                          <Link
                            key={childIndex}
                            href={child.href}
                            prefetch={false}
                            className={`cms-submenu-item ${isChildActive ? "cms-submenu-item-active" : ""}`}
                          >
                            {child.title}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href || "#"}
                  prefetch={false}
                  className={`cms-menu-item ${isActive(item.href || "", item.exact) ? "cms-menu-item-active" : ""}`}
                >
                  <span className="cms-menu-icon">{item.icon}</span>
                  {(sidebarOpen || isMobile) && <span className="cms-menu-title">{item.title}</span>}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Language Selector */}
        {(sidebarOpen || isMobile) && (
          <div className="cms-language-section">
            <label className="cms-language-label">
              {t.cms.language}
            </label>
            <select
              className="cms-language-select"
              value={cmsLocale}
              onChange={(e) => {
                const newLocale = e.target.value as Locale;
                setCmsLocale(newLocale);
                localStorage.setItem("cms-locale", newLocale);
                // Trigger custom event to notify other components
                window.dispatchEvent(new Event("cms-locale-changed"));
              }}
            >
              {locales.map((locale) => (
                <option key={locale} value={locale}>
                  {localeNames[locale]} ({locale.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Toggle button - only show on desktop */}
        {!isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="cms-sidebar-toggle"
            title={sidebarOpen ? t.cms.collapse : t.cms.expand}
          >
            {sidebarOpen ? (
              <ChevronLeft size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        )}
      </div>

      {/* Main Content */}
      <div
        className={`cms-main-content ${isMobile ? "cms-main-content-mobile" : ""}`}
        style={{
          marginLeft: isMobile 
            ? "0" 
            : (sidebarOpen ? "240px" : "64px"),
        }}
      >
        {children}
      </div>
    </div>
  );
}
