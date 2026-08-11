"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserStatus } from "@/components/UserStatus";
import { localeLink, type Locale } from "@/lib/localeLink";
import { getTranslations } from "@/lib/getTranslations";

interface User {
  _id: string;
  username: string;
  email: string;
  displayName?: string;
  profilePicture?: string;
  headline?: string;
  organization?: string;
  location?: string;
  country?: string;
  city?: string;
}

interface Post {
  _id: string;
  title: string;
  excerpt?: string;
  slug: string;
  type: "news" | "event";
  featuredImage?: string;
  locale?: string;
  createdAt?: string;
  publishedAt?: string;
  metadata?: {
    titleTranslations?: Record<string, string>;
    excerptTranslations?: Record<string, string>;
  };
}

function SearchPageContent({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<string>("desc");
  const [loading, setLoading] = useState(false);
  const limit = 12;
  // Search scope locked to users — this page is dedicated to finding people
  // (and building group chats). Posts/news/events live on their own pages.
  const [searchType, setSearchType] = useState<"all" | "users" | "posts">("users");
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>("me");
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Group-chat creation from search results
  const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = getTranslations(locale);

  // Extract locale from params
  useEffect(() => {
    params.then((resolvedParams) => {
      const loc = (resolvedParams.locale as Locale) || "me";
      setLocale(loc);
    });
  }, [params]);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [pathname]);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
        // Get locale from pathname if not set yet
        const currentLocale: Locale = (() => {
          const match = pathname?.match(/^\/([^\/]+)/);
          if (match && ["me", "en", "it", "sq"].includes(match[1])) {
            return match[1] as Locale;
          }
          return locale || "me";
        })();
        router.push(localeLink("/login", currentLocale));
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setAuthenticated(false);
      // Get locale from pathname if not set yet
      const currentLocale: Locale = (() => {
        const match = pathname?.match(/^\/([^\/]+)/);
        if (match && ["me", "en", "it", "sq"].includes(match[1])) {
          return match[1] as Locale;
        }
        return locale || "me";
      })();
      router.push(localeLink("/login", currentLocale));
    } finally {
      setCheckingAuth(false);
    }
  }

  // Load query from URL on mount
  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (urlQuery) {
      setQuery(urlQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    // Load all users on mount only if authenticated
    if (authenticated && !checkingAuth) {
      loadUsers(1, query, countryFilter, cityFilter, sortBy, sortDir);
    }
  }, [authenticated, checkingAuth]);

  // Reload when page changes
  useEffect(() => {
    if (authenticated && !checkingAuth) {
      loadUsers(page, query, countryFilter, cityFilter, sortBy, sortDir);
    }
  }, [page]);

  useEffect(() => {
    // If there's a search query or filter change, reload with debounce
    if (!authenticated || checkingAuth) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      loadUsers(1, query, countryFilter, cityFilter, sortBy, sortDir);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, countryFilter, cityFilter, sortBy, sortDir]);

  useEffect(() => {
    // Load countries once
    let mounted = true;
    fetch("/api/locations/countries")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setCountries(data.countries || []);
      })
      .catch((err) => console.error("Failed to load countries:", err));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Load cities when countryFilter changes
    let mounted = true;
    if (!countryFilter) {
      setCities([]);
      return;
    }
    fetch(`/api/locations/cities?country=${encodeURIComponent(countryFilter)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setCities(data.cities || []);
      })
      .catch((err) => {
        console.error("Failed to load cities:", err);
        setCities([]);
      });
    return () => {
      mounted = false;
    };
  }, [countryFilter]);

  useEffect(() => {
    loadConnectionStatuses();
  }, [users]);

  async function loadUsers(p: number, searchQuery: string, country: string, city: string, sb: string, sd: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(p));
      params.append("limit", String(limit));
      if (searchQuery.trim().length >= 2) params.append("q", searchQuery.trim());
      if (country) params.append("country", country);
      if (city) params.append("city", city);
      params.append("sortBy", sb);
      params.append("sortDir", sd);

      const res = await fetch(`/api/users/list?${params.toString()}`);
      if (res.status === 401) {
        router.push(localeLink("/login", locale));
        return;
      }
      const data = await res.json();
      if (data.error) {
        console.error("API error:", data.error);
        setUsers([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadConnectionStatuses() {
    if (users.length === 0) return;

    try {
      const res = await fetch("/api/connections");
      if (res.ok) {
        const data = await res.json();
        const statusMap: Record<string, string> = {};
        data.connections?.forEach((conn: any) => {
          const otherUserId = conn.user?._id;
          if (otherUserId) {
            statusMap[otherUserId] = conn.status;
          }
        });
        setConnectionStatuses(statusMap);
      }
    } catch (error) {
      console.error("Error loading connection statuses:", error);
    }
  }

  async function handleSendRequest(userId: string) {
    setSending(userId);
    try {
      const res = await fetch("/api/connections/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: userId }),
      });

      if (res.ok) {
        setConnectionStatuses((prev) => ({ ...prev, [userId]: "pending" }));
      } else {
        const error = await res.json();
        alert(error.error || t.search.failedToSend);
      }
    } catch (error) {
      console.error("Error sending connection request:", error);
      alert(t.search.errorSending);
    } finally {
      setSending(null);
    }
  }

  function getConnectionButton(userId: string) {
    const status = connectionStatuses[userId];

    if (status === "accepted") {
      return (
        <span
          style={{
            padding: "6px 16px",
            background: "#e3f0ff",
            color: "#0a66c2",
            borderRadius: "16px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {t.search.connected}
        </span>
      );
    }

    if (status === "pending") {
      return (
        <span
          style={{
            padding: "6px 16px",
            background: "#fff3cd",
            color: "#856404",
            borderRadius: "16px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {t.search.pending}
        </span>
      );
    }

    return (
      <button
        onClick={() => handleSendRequest(userId)}
        disabled={sending === userId}
        style={{
          padding: "8px 24px",
          border: "1px solid #0a66c2",
          background: "white",
          color: "#0a66c2",
          borderRadius: "24px",
          cursor: sending === userId ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "600",
          opacity: sending === userId ? 0.6 : 1,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (sending !== userId) {
            e.currentTarget.style.background = "#e3f0ff";
            e.currentTarget.style.transform = "scale(1.05)";
          }
        }}
        onMouseLeave={(e) => {
          if (sending !== userId) {
            e.currentTarget.style.background = "white";
            e.currentTarget.style.transform = "scale(1)";
          }
        }}
      >
        {sending === userId ? t.search.sending : t.search.connect}
      </button>
    );
  }

  // Show loading or nothing while checking auth
  if (checkingAuth || !authenticated) {
    return (
      <main style={{ background: "#f3f2ef", minHeight: "100vh", padding: "24px" }}>
        <div style={{ maxWidth: "1128px", margin: "0 auto", textAlign: "center", padding: "40px" }}>
          <div
            style={{
              display: "inline-block",
              width: "30px",
              height: "30px",
              border: "3px solid #2271b1",
              borderTop: "3px solid transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ marginTop: "12px" }}>{t.search.loading}</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "#f3f2ef", minHeight: "100vh", padding: "24px" }}>
      <div style={{ maxWidth: "1128px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "600", marginBottom: "24px" }}>
          {t.search.title}
        </h1>

        {/* eCommunication welcome message */}
        <div
          style={{
            background: "linear-gradient(135deg, #0a66c2 0%, #004182 100%)",
            color: "white",
            borderRadius: "8px",
            padding: "28px",
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(10, 102, 194, 0.2)",
          }}
        >
          <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>
            {t.search.welcomeTitle}
          </h2>
          <p style={{ fontSize: "15px", lineHeight: "1.6", marginBottom: "20px", opacity: 0.95 }}>
            {t.search.welcomeIntro}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "14px", lineHeight: "1.5", margin: 0 }}>
              🔍 {t.search.welcomeSearch}
            </p>
            <p style={{ fontSize: "14px", lineHeight: "1.5", margin: 0 }}>
              🤝 {t.search.welcomeConnect}
            </p>
            <p style={{ fontSize: "14px", lineHeight: "1.5", margin: 0 }}>
              💬 {t.search.welcomeCommunicate}
            </p>
            <p style={{ fontSize: "14px", lineHeight: "1.5", margin: 0 }}>
              🌐 {t.search.welcomeCollaborate}
            </p>
          </div>
        </div>

        {/* Results Section */}
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header row with title, showing info, and filters */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: 0 }}>
              {query.trim().length >= 2
                ? `${t.search.usersWithCount} (${total})`
                : t.search.allUsers}{" "}
              <span style={{ fontSize: "14px", fontWeight: "400", color: "#666" }}>
                (Showing {users.length > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total})
              </span>
            </h2>
          </div>

          {/* Search and Filters row */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search.placeholderUsers || "Search users"}
              style={{
                flex: "1 1 250px",
                padding: "10px 14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                minWidth: "200px",
              }}
            />
            <select
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setCityFilter("");
              }}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "14px",
                flex: "0 0 180px",
              }}
            >
              <option value="">{t.search.allCountries || "-- Country --"}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "14px",
                flex: "0 0 180px",
              }}
            >
              <option value="">{t.search.allCities || "-- City --"}</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [sb, sd] = e.target.value.split("-");
                setSortBy(sb);
                setSortDir(sd);
                setPage(1);
              }}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "14px",
                flex: "0 0 160px",
              }}
            >
              <option value="createdAt-desc">Newest first</option>
              <option value="createdAt-asc">Oldest first</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="email-asc">Email A–Z</option>
              <option value="email-desc">Email Z–A</option>
            </select>
          </div>

          {/* Selected-for-group action bar */}
          {selectedForGroup.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "10px 14px",
                marginBottom: "16px",
                background: "#eaf3fb",
                border: "1px solid #b6d4f0",
                borderRadius: "8px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "14px", color: "#0a66c2", fontWeight: 600 }}>
                {selectedForGroup.length} selected for group chat
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setSelectedForGroup([])}
                  style={{
                    padding: "8px 14px",
                    border: "1px solid #b6d4f0",
                    background: "white",
                    color: "#0a66c2",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    setGroupError(null);
                    setNewGroupName("");
                    setNewGroupDescription("");
                    setShowCreateGroupDialog(true);
                  }}
                  style={{
                    padding: "8px 14px",
                    border: "none",
                    background: "#0a66c2",
                    color: "white",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Create group chat
                </button>
              </div>
            </div>
          )}
           
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <div
                  style={{
                    display: "inline-block",
                    width: "30px",
                    height: "30px",
                    border: "3px solid #2271b1",
                    borderTop: "3px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <p style={{ marginTop: "12px" }}>{t.search.loading}</p>
              </div>
            ) : (
              <>
                {/* Posts Results */}
                {posts.length > 0 && (searchType === "all" || searchType === "posts") && (
                  <div style={{ marginBottom: "24px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#666" }}>
                      {t.search.blogs} ({posts.length})
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {posts.map((post) => {
                        const postTitle = post.metadata?.titleTranslations?.[locale] || post.title;
                        const postExcerpt = post.metadata?.excerptTranslations?.[locale] || post.excerpt || "";
                        const postSlug = post.slug;
                        const postType = post.type;
                        
                        return (
                          <Link
                            key={post._id}
                            href={localeLink(`/${postType === "news" ? "news" : "events"}/${postSlug}`, locale)}
                            style={{
                              display: "flex",
                              gap: "16px",
                              padding: "16px",
                              border: "1px solid #e0e0e0",
                              borderRadius: "8px",
                              textDecoration: "none",
                              color: "inherit",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f8f8f8";
                              e.currentTarget.style.borderColor = "#2271b1";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.borderColor = "#e0e0e0";
                            }}
                          >
                            {post.featuredImage && (
                              <img
                                src={post.featuredImage}
                                alt={postTitle}
                                style={{
                                  width: "120px",
                                  height: "80px",
                                  objectFit: "cover",
                                  borderRadius: "6px",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ 
                                fontSize: "12px", 
                                color: "#666", 
                                marginBottom: "4px",
                                textTransform: "uppercase",
                                fontWeight: "600",
                              }}>
                                {postType === "news" ? "Vijest" : postType === "event" ? "Događaj" : "Resurs"}
                              </div>
                              <h4 style={{ 
                                fontSize: "16px", 
                                fontWeight: "600", 
                                marginBottom: "8px",
                                color: "#333",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}>
                                {postTitle}
                              </h4>
                              {postExcerpt && (
                                <p style={{ 
                                  fontSize: "14px", 
                                  color: "#666",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                }}>
                                  {postExcerpt.replace(/<[^>]*>/g, "")}
                                </p>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Users Results */}
                {users.length > 0 && (searchType === "all" || searchType === "users") && (
                  <div>
                    {posts.length > 0 && searchType === "all" && (
                      <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#666" }}>
                        {t.search.users} ({users.length})
                      </h3>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {users.map((user) => {
                        const isSelected = selectedForGroup.includes(user._id);
                        return (
                        <div
                          key={user._id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "16px",
                            border: `1px solid ${isSelected ? "#0a66c2" : "#e0e0e0"}`,
                            background: isSelected ? "#f3f8fd" : "white",
                            borderRadius: "8px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedForGroup((prev) => [...prev, user._id]);
                                } else {
                                  setSelectedForGroup((prev) =>
                                    prev.filter((id) => id !== user._id)
                                  );
                                }
                              }}
                              title="Select for group chat"
                              style={{ width: "18px", height: "18px", cursor: "pointer" }}
                            />
                            <div
                              style={{
                                position: "relative",
                                width: "64px",
                                height: "64px",
                              }}
                            >
                              <div
                                style={{
                                  width: "64px",
                                  height: "64px",
                                  borderRadius: "50%",
                                  background: user.profilePicture
                                    ? `url(${user.profilePicture}) center/cover`
                                    : "#e4e4e4",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "24px",
                                  color: "#666",
                                }}
                              >
                                {!user.profilePicture &&
                                  (user.displayName || user.username)?.[0]?.toUpperCase()}
                              </div>
                              <UserStatus userId={user._id} size="medium" />
                            </div>
                            <div>
                              <Link
                                href={localeLink(`/user-profile?id=${user._id}`, locale)}
                                style={{
                                  fontSize: "18px",
                                  fontWeight: "600",
                                  color: "#0a66c2",
                                  textDecoration: "none",
                                  display: "block",
                                  marginBottom: "4px",
                                }}
                              >
                                {user.displayName || user.username}
                              </Link>
                              {user.headline && (
                                <p style={{ fontSize: "14px", color: "#666", margin: "4px 0" }}>
                                  {user.headline}
                                </p>
                              )}
                              <p style={{ fontSize: "14px", color: "#999", margin: "4px 0" }}>
                                {user.email}
                              </p>
                              {(user.organization || user.location) && (
                                <p style={{ fontSize: "14px", color: "#666", margin: "4px 0" }}>
                                  {user.organization}
                                  {user.organization && user.location && " • "}
                                  {user.location}
                                </p>
                              )}
                            </div>
                          </div>
                          {getConnectionButton(user._id)}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #eee" }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      style={{
                        padding: "8px 14px",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        background: page <= 1 ? "#f3f3f3" : "white",
                        color: page <= 1 ? "#999" : "#333",
                        cursor: page <= 1 ? "default" : "pointer",
                        fontSize: "13px",
                      }}
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const pn = start + i;
                      if (pn > totalPages) return null;
                      return (
                        <button
                          key={pn}
                          onClick={() => setPage(pn)}
                          style={{
                            padding: "8px 14px",
                            border: pn === page ? "1px solid #2271b1" : "1px solid #ccc",
                            borderRadius: "6px",
                            background: pn === page ? "#2271b1" : "white",
                            color: pn === page ? "white" : "#333",
                            fontWeight: pn === page ? "600" : "400",
                            cursor: "pointer",
                            fontSize: "13px",
                            minWidth: "40px",
                          }}
                        >
                          {pn}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      style={{
                        padding: "8px 14px",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        background: page >= totalPages ? "#f3f3f3" : "white",
                        color: page >= totalPages ? "#999" : "#333",
                        cursor: page >= totalPages ? "default" : "pointer",
                        fontSize: "13px",
                      }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        {/* No results / empty state */}
        {!loading && users.length === 0 && (
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "40px",
              textAlign: "center",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
            }}
          >
            <p style={{ fontSize: "14px", color: "#666" }}>
              {query.trim().length >= 2
                ? t.search.noUsersFound || "No users found"
                : !countryFilter && !cityFilter
                ? t.search.enterAtLeast2 || "Enter at least 2 characters to search"
                : t.search.noUsersFound || "No users found"}
            </p>
          </div>
        )}

      </div>

      {/* Create group chat dialog */}
      {showCreateGroupDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            if (!creatingGroup) setShowCreateGroupDialog(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "10px",
              padding: "24px",
              width: "90%",
              maxWidth: "440px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "4px" }}>
              Create group chat
            </h2>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
              {selectedForGroup.length} member
              {selectedForGroup.length === 1 ? "" : "s"} will be invited.
            </p>
            {groupError && (
              <div
                style={{
                  padding: "8px 10px",
                  background: "#fee",
                  border: "1px solid #fcc",
                  borderRadius: "6px",
                  color: "#c33",
                  fontSize: "13px",
                  marginBottom: "12px",
                }}
              >
                {groupError}
              </div>
            )}
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "4px" }}>
              Group name *
            </label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Project team"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                marginBottom: "12px",
                boxSizing: "border-box",
              }}
            />
            <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "4px" }}>
              Description (optional)
            </label>
            <textarea
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                marginBottom: "16px",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowCreateGroupDialog(false)}
                disabled={creatingGroup}
                style={{
                  padding: "9px 16px",
                  border: "1px solid #ddd",
                  background: "white",
                  borderRadius: "6px",
                  fontSize: "14px",
                  cursor: creatingGroup ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                disabled={creatingGroup || !newGroupName.trim()}
                onClick={async () => {
                  setGroupError(null);
                  setCreatingGroup(true);
                  try {
                    const res = await fetch("/api/groups", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: newGroupName.trim(),
                        description: newGroupDescription.trim(),
                        memberIds: selectedForGroup,
                      }),
                    });
                    if (!res.ok) {
                      const d = await res.json().catch(() => ({}));
                      setGroupError(d.error || "Failed to create group");
                      setCreatingGroup(false);
                      return;
                    }
                    const data = await res.json();
                    setShowCreateGroupDialog(false);
                    setSelectedForGroup([]);
                    setNewGroupName("");
                    setNewGroupDescription("");
                    setCreatingGroup(false);
                    router.push(localeLink(`/chat?groupId=${data._id}`, locale));
                  } catch (err: any) {
                    setGroupError(err?.message || "Failed to create group");
                    setCreatingGroup(false);
                  }
                }}
                style={{
                  padding: "9px 16px",
                  border: "none",
                  background:
                    creatingGroup || !newGroupName.trim() ? "#9ec3e8" : "#0a66c2",
                  color: "white",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor:
                    creatingGroup || !newGroupName.trim() ? "not-allowed" : "pointer",
                }}
              >
                {creatingGroup ? "Creating..." : "Create group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function SearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <Suspense fallback={
      <main style={{ background: "#f3f2ef", minHeight: "100vh", padding: "24px" }}>
        <div style={{ maxWidth: "1128px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div
              style={{
                display: "inline-block",
                width: "30px",
                height: "30px",
                border: "3px solid #2271b1",
                borderTop: "3px solid transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        </div>
      </main>
    }>
      <SearchPageContent params={params} />
    </Suspense>
  );
}
