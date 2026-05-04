"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { UserStatus } from "@/components/UserStatus";
import { localeLink, type Locale } from "@/lib/localeLink";

interface User {
  _id: string;
  username: string;
  email: string;
  displayName?: string;
  profilePicture?: string;
  headline?: string;
  organization?: string;
  location?: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Extract locale from pathname
  const locale: Locale = (() => {
    const match = pathname?.match(/^\/([^\/]+)/);
    if (match && ["me", "en", "it", "sq"].includes(match[1])) {
      return match[1] as Locale;
    }
    return "me";
  })();

  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length >= 2) {
      setLoading(true);
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(query);
      }, 300);
    } else {
      setUsers([]);
      setLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  useEffect(() => {
    loadConnectionStatuses();
  }, [users]);

  async function searchUsers(searchQuery: string) {
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.status === 401) {
        router.push(localeLink("/login", locale));
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error searching users:", error);
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
        alert(error.error || "Failed to send connection request");
      }
    } catch (error) {
      console.error("Error sending connection request:", error);
      alert("Error sending connection request");
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
          Connected
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
          Pending
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
        {sending === userId ? "Sending..." : "Connect"}
      </button>
    );
  }

  return (
    <main style={{ background: "#f3f2ef", minHeight: "100vh", padding: "24px" }}>
      <div style={{ maxWidth: "1128px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "600", marginBottom: "24px" }}>
          Search Users
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
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter name or email..."
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "16px",
              transition: "all 0.2s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#0a66c2";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10, 102, 194, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#ddd";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        {loading && (
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
        )}

        {!loading && query.trim().length >= 2 && (
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "24px",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
              Search Results {users.length > 0 && `(${users.length})`}
            </h2>
            {users.length > 0 ? (
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
            ) : (
              <p style={{ fontSize: "14px", color: "#666" }}>
                No users found. Try a different search term.
              </p>
            )}
          </div>
        )}

        {!loading && query.trim().length < 2 && (
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "24px",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "14px", color: "#666" }}>
              Enter at least 2 characters to search for users.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
