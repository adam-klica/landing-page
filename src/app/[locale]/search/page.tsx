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
  const [allUsers, setAllUsers] = useState<User[]>([]); // Store all users
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<"all" | "users" | "posts">("all");
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>("me");
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
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
      setLoading(true);
      loadAllUsers();
    }
  }, [authenticated, checkingAuth]);

  useEffect(() => {
    // If there's a search query, use global search API
    if (query.trim().length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        performGlobalSearch();
      }, 300);

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    } else {
      // If no query, filter all users by country/city filters
      if (allUsers.length === 0) {
        return;
      }

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        filterUsers();
      }, 300);

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }
  }, [query, countryFilter, cityFilter, allUsers, searchType]);

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

  async function loadAllUsers() {
    try {
      // Load all users with a high limit
      let allUsersList: User[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams();
        params.append("page", String(page));
        params.append("limit", String(limit));
        const res = await fetch(`/api/users/list?${params.toString()}`);
        if (res.status === 401) {
          router.push(localeLink("/login", locale));
          return;
        }
        const data = await res.json();
        if (data.error) {
          console.error("API error:", data.error);
          hasMore = false;
          break;
        }
        if (data.users && data.users.length > 0) {
          allUsersList = [...allUsersList, ...data.users];
          if (data.users.length < limit) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      setAllUsers(allUsersList);
      // Apply filters immediately after loading
      if (allUsersList.length > 0) {
        // Use the filterUsers logic directly here
        let filtered = [...allUsersList];
        
        // Filter by query
        if (query.trim().length > 0) {
          const queryLower = query.toLowerCase().trim();
          filtered = filtered.filter((user) => {
            const name = (user.displayName || user.username || "").toLowerCase();
            const email = (user.email || "").toLowerCase();
            const headline = (user.headline || "").toLowerCase();
            const organization = (user.organization || "").toLowerCase();
            return (
              name.includes(queryLower) ||
              email.includes(queryLower) ||
              headline.includes(queryLower) ||
              organization.includes(queryLower)
            );
          });
        }
        
        // Filter by country
        if (countryFilter) {
          filtered = filtered.filter((user) => {
            if (user.country) {
              return user.country === countryFilter;
            }
            if (user.location) {
              const parts = user.location.split(",").map((p: string) => p.trim());
              const locationCountry = parts[parts.length - 1];
              return locationCountry === countryFilter || user.location.toLowerCase().includes(countryFilter.toLowerCase());
            }
            return false;
          });
        }
        
        // Filter by city
        if (cityFilter) {
          filtered = filtered.filter((user) => {
            if (user.city) {
              return user.city === cityFilter;
            }
            if (user.location) {
              const parts = user.location.split(",").map((p: string) => p.trim());
              const locationCity = parts[0];
              return locationCity === cityFilter || user.location.toLowerCase().includes(cityFilter.toLowerCase());
            }
            return false;
          });
        }
        
        setUsers(filtered);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Error loading all users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  function filterUsers() {
    if (allUsers.length === 0) {
      // If no users loaded yet, show empty array
      setUsers([]);
      return;
    }

    let filtered = [...allUsers];

    // Filter by query (search in name, email, headline, organization) - works with any length
    if (query.trim().length > 0) {
      const queryLower = query.toLowerCase().trim();
      filtered = filtered.filter((user) => {
        const name = (user.displayName || user.username || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        const headline = (user.headline || "").toLowerCase();
        const organization = (user.organization || "").toLowerCase();
        return (
          name.includes(queryLower) ||
          email.includes(queryLower) ||
          headline.includes(queryLower) ||
          organization.includes(queryLower)
        );
      });
    }

    // Filter by country - but don't exclude users without country if no filter is set
    if (countryFilter) {
      filtered = filtered.filter((user) => {
        // Check country field directly
        if (user.country) {
          return user.country === countryFilter;
        }
        // Parse from location string (format: "city, region, country" or "city, country")
        if (user.location) {
          const parts = user.location.split(",").map((p: string) => p.trim());
          const locationCountry = parts[parts.length - 1]; // Last part is usually country
          return locationCountry === countryFilter || user.location.toLowerCase().includes(countryFilter.toLowerCase());
        }
        // If user has no country info and filter is set, exclude them
        return false;
      });
    }

    // Filter by city - but don't exclude users without city if no filter is set
    if (cityFilter) {
      filtered = filtered.filter((user) => {
        // Check city field directly
        if (user.city) {
          return user.city === cityFilter;
        }
        // Parse from location string (format: "city, region, country" or "city, country")
        if (user.location) {
          const parts = user.location.split(",").map((p: string) => p.trim());
          const locationCity = parts[0]; // First part is usually city
          return locationCity === cityFilter || user.location.toLowerCase().includes(cityFilter.toLowerCase());
        }
        // If user has no city info and filter is set, exclude them
        return false;
      });
    }

    setUsers(filtered);
    // Clear posts when filtering users only
    setPosts([]);
  }

  async function performGlobalSearch() {
    if (query.trim().length < 2) {
      setUsers([]);
      setPosts([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("q", query.trim());
      params.append("type", searchType);
      
      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.status === 401) {
        router.push(localeLink("/login", locale));
        return;
      }
      
      const data = await res.json();
      
      // Apply country/city filters to users if needed
      let filteredUsers = data.users || [];
      if (countryFilter || cityFilter) {
        filteredUsers = filteredUsers.filter((user: User) => {
          if (countryFilter) {
            if (user.country) {
              if (user.country !== countryFilter) return false;
            } else if (user.location) {
              const parts = user.location.split(",").map((p: string) => p.trim());
              const locationCountry = parts[parts.length - 1];
              if (locationCountry !== countryFilter && !user.location.toLowerCase().includes(countryFilter.toLowerCase())) {
                return false;
              }
            } else {
              return false;
            }
          }
          
          if (cityFilter) {
            if (user.city) {
              if (user.city !== cityFilter) return false;
            } else if (user.location) {
              const parts = user.location.split(",").map((p: string) => p.trim());
              const locationCity = parts[0];
              if (locationCity !== cityFilter && !user.location.toLowerCase().includes(cityFilter.toLowerCase())) {
                return false;
              }
            } else {
              return false;
            }
          }
          
          return true;
        });
      }
      
      setUsers(filteredUsers);
      setPosts(data.posts || []);
      loadConnectionStatuses();
    } catch (error) {
      console.error("Error performing global search:", error);
      setUsers([]);
      setPosts([]);
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

        <div
          style={{
            background: "white",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
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
                flex: "0 0 220px"
              }}
            >
              <option value="">{t.search.allCountries || "-- Country --"}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
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
                flex: "0 0 220px"
              }}
            >
              <option value="">{t.search.allCities || "-- City --"}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search.placeholder}
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            />
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as "all" | "users" | "posts")}
              style={{
                padding: "12px 16px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <option value="all">{t.search.all}</option>
              <option value="users">{t.search.users}</option>
              <option value="posts">{t.search.blogs}</option>
            </select>
          </div>
          
          {query.trim().length >= 2 && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <button
                onClick={() => setSearchType("all")}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "6px",
                  background: searchType === "all" ? "#2271b1" : "#f0f0f0",
                  color: searchType === "all" ? "white" : "#333",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: searchType === "all" ? "600" : "400",
                }}
              >
                Sve ({users.length + posts.length})
              </button>
              <button
                onClick={() => setSearchType("users")}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "6px",
                  background: searchType === "users" ? "#2271b1" : "#f0f0f0",
                  color: searchType === "users" ? "white" : "#333",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: searchType === "users" ? "600" : "400",
                }}
              >
                {t.search.users} ({users.length})
              </button>
              <button
                onClick={() => setSearchType("posts")}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "6px",
                  background: searchType === "posts" ? "#2271b1" : "#f0f0f0",
                  color: searchType === "posts" ? "white" : "#333",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: searchType === "posts" ? "600" : "400",
                }}
              >
                {t.search.blogs} ({posts.length})
              </button>
            </div>
          )}
        </div>

        {/* Results Section */}
        {(query.trim().length >= 2 || users.length > 0 || posts.length > 0) && (
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "24px",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
              {query.trim().length > 0 
                ? (searchType === "all" 
                    ? `${t.search.searchResultsWithCount} (${users.length + posts.length})`
                    : searchType === "users"
                    ? `${t.search.usersWithCount} (${users.length})`
                    : `${t.search.blogsWithCount} (${posts.length})`)
                : t.search.allUsers} {users.length > 0 && query.trim().length === 0 && `(${users.length})`}
            </h2>
            
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
                      {users.map((user) => (
                        <div
                          key={user._id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "16px",
                            border: "1px solid #e0e0e0",
                            borderRadius: "8px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results Message */}
                {query.trim().length >= 2 && users.length === 0 && posts.length === 0 && (
                  <div style={{ padding: "40px", textAlign: "center" }}>
                    <p style={{ fontSize: "14px", color: "#666" }}>
                      {searchType === "posts" 
                        ? t.search.noBlogsFound
                        : searchType === "users"
                        ? t.search.noUsersFound
                        : t.search.noResultsFoundMessage}
                    </p>
                  </div>
                )}

                {/* Show all users when no query */}
                {query.trim().length === 0 && users.length === 0 && (
                  <div style={{ padding: "40px", textAlign: "center" }}>
                    <p style={{ fontSize: "14px", color: "#666" }}>
                      {t.search.enterAtLeast2}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
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
