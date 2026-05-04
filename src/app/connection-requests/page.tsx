"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { UserStatus } from "@/components/UserStatus";
import { localeLink, type Locale } from "@/lib/localeLink";

interface Connection {
  _id: string;
  status: "pending" | "accepted" | "declined";
  user: {
    _id: string;
    username: string;
    email: string;
    displayName?: string;
    profilePicture?: string;
    headline?: string;
  } | null;
  isIncoming: boolean;
}

export default function ConnectionRequestsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  
  // Extract locale from pathname
  const locale: Locale = (() => {
    const match = pathname?.match(/^\/([^\/]+)/);
    if (match && ["me", "en", "it", "sq"].includes(match[1])) {
      return match[1] as Locale;
    }
    return "me";
  })();

  useEffect(() => {
    loadConnections();
  }, []);

  async function loadConnections() {
    try {
      const res = await fetch("/api/connections");
      if (res.status === 401) {
        router.push(localeLink("/login", locale));
        return;
      }
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (error) {
      console.error("Error loading connections:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(connectionId: string) {
    setProcessing(connectionId);
    try {
      const res = await fetch("/api/connections/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });

      if (res.ok) {
        await loadConnections();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to accept request");
      }
    } catch (error) {
      console.error("Error accepting connection:", error);
      alert("Error accepting connection");
    } finally {
      setProcessing(null);
    }
  }

  async function handleDecline(connectionId: string) {
    setProcessing(connectionId);
    try {
      const res = await fetch("/api/connections/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });

      if (res.ok) {
        await loadConnections();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to decline request");
      }
    } catch (error) {
      console.error("Error declining connection:", error);
      alert("Error declining connection");
    } finally {
      setProcessing(null);
    }
  }

  const pendingRequests = connections.filter(
    (conn) => conn.status === "pending" && conn.isIncoming
  );
  const acceptedConnections = connections.filter(
    (conn) => conn.status === "accepted"
  );
  const sentRequests = connections.filter(
    (conn) => conn.status === "pending" && !conn.isIncoming
  );

  if (loading) {
    return (
      <main style={{ padding: "40px", textAlign: "center" }}>
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
      </main>
    );
  }

  return (
    <main style={{ background: "#f3f2ef", minHeight: "100vh", padding: "24px" }}>
      <div style={{ maxWidth: "1128px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "600", marginBottom: "24px" }}>
          Connections
        </h1>

        {/* Pending Incoming Requests */}
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "16px" }}>
            Pending Connection Requests
          </h2>
          {pendingRequests.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {pendingRequests.map((conn) => (
                <div
                  key={conn._id}
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
                        width: "48px",
                        height: "48px",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background: conn.user?.profilePicture
                            ? `url(${conn.user.profilePicture}) center/cover`
                            : "#e4e4e4",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px",
                          color: "#666",
                        }}
                      >
                        {!conn.user?.profilePicture &&
                          (conn.user?.displayName || conn.user?.username)?.[0]?.toUpperCase()}
                      </div>
                      {conn.user?._id && <UserStatus userId={conn.user._id} size="small" />}
                    </div>
                    <div>
                      <Link
                        href={localeLink(`/user-profile?id=${conn.user?._id}`, locale)}
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#0a66c2",
                          textDecoration: "none",
                        }}
                      >
                        {conn.user?.displayName || conn.user?.username}
                      </Link>
                      {conn.user?.headline && (
                        <p style={{ fontSize: "14px", color: "#666", margin: "4px 0 0" }}>
                          {conn.user.headline}
                        </p>
                      )}
                      <p style={{ fontSize: "14px", color: "#999", margin: "4px 0 0" }}>
                        {conn.user?.email}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleAccept(conn._id)}
                      disabled={processing === conn._id}
                      style={{
                        padding: "8px 24px",
                        border: "none",
                        background: "#0a66c2",
                        color: "white",
                        borderRadius: "24px",
                        cursor: processing === conn._id ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        opacity: processing === conn._id ? 0.6 : 1,
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (processing !== conn._id) {
                          e.currentTarget.style.background = "#004182";
                          e.currentTarget.style.transform = "scale(1.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (processing !== conn._id) {
                          e.currentTarget.style.background = "#0a66c2";
                          e.currentTarget.style.transform = "scale(1)";
                        }
                      }}
                    >
                      {processing === conn._id ? "Processing..." : "Accept"}
                    </button>
                    <button
                      onClick={() => handleDecline(conn._id)}
                      disabled={processing === conn._id}
                      style={{
                        padding: "8px 24px",
                        border: "1px solid #666",
                        background: "white",
                        color: "#666",
                        borderRadius: "24px",
                        cursor: processing === conn._id ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        opacity: processing === conn._id ? 0.6 : 1,
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (processing !== conn._id) {
                          e.currentTarget.style.background = "#f5f5f5";
                          e.currentTarget.style.transform = "scale(1.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (processing !== conn._id) {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.transform = "scale(1)";
                        }
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "14px", color: "#666" }}>No pending requests.</p>
          )}
        </div>

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "24px",
              marginBottom: "24px",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "16px" }}>
              Sent Requests
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {sentRequests.map((conn) => (
                <div
                  key={conn._id}
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
                        width: "48px",
                        height: "48px",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background: conn.user?.profilePicture
                            ? `url(${conn.user.profilePicture}) center/cover`
                            : "#e4e4e4",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px",
                          color: "#666",
                        }}
                      >
                        {!conn.user?.profilePicture &&
                          (conn.user?.displayName || conn.user?.username)?.[0]?.toUpperCase()}
                      </div>
                      {conn.user?._id && <UserStatus userId={conn.user._id} size="small" />}
                    </div>
                    <div>
                      <Link
                        href={localeLink(`/user-profile?id=${conn.user?._id}`, locale)}
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#0a66c2",
                          textDecoration: "none",
                        }}
                      >
                        {conn.user?.displayName || conn.user?.username}
                      </Link>
                      {conn.user?.headline && (
                        <p style={{ fontSize: "14px", color: "#666", margin: "4px 0 0" }}>
                          {conn.user.headline}
                        </p>
                      )}
                    </div>
                  </div>
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
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accepted Connections */}
        {acceptedConnections.length > 0 && (
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "24px",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "16px" }}>
              Connections ({acceptedConnections.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {acceptedConnections.map((conn) => (
                <div
                  key={conn._id}
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
                        width: "48px",
                        height: "48px",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background: conn.user?.profilePicture
                            ? `url(${conn.user.profilePicture}) center/cover`
                            : "#e4e4e4",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px",
                          color: "#666",
                        }}
                      >
                        {!conn.user?.profilePicture &&
                          (conn.user?.displayName || conn.user?.username)?.[0]?.toUpperCase()}
                      </div>
                      {conn.user?._id && <UserStatus userId={conn.user._id} size="small" />}
                    </div>
                    <div>
                      <Link
                        href={localeLink(`/user-profile?id=${conn.user?._id}`, locale)}
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#0a66c2",
                          textDecoration: "none",
                        }}
                      >
                        {conn.user?.displayName || conn.user?.username}
                      </Link>
                      {conn.user?.headline && (
                        <p style={{ fontSize: "14px", color: "#666", margin: "4px 0 0" }}>
                          {conn.user.headline}
                        </p>
                      )}
                    </div>
                  </div>
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
