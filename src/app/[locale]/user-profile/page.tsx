"use client";

import { Suspense, useState, useEffect, use } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
  coverImage?: string;
  headline?: string;
  about?: string;
  organization?: string;
  location?: string;
  role_custom?: string;
  interests?: string;
  experience?: any[];
  education?: any[];
  skills?: string[];
  website?: string;
  phone?: string;
  linkedin?: string;
  twitter?: string;
}

function UserProfilePageInner({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [locale, setLocale] = useState<Locale>("me");
  const [t, setT] = useState(getTranslations("me"));

  // Extract locale from params
  useEffect(() => {
    params.then((resolvedParams) => {
      const loc = (resolvedParams.locale as Locale) || "me";
      setLocale(loc);
      setT(getTranslations(loc));
    });
  }, [params]);

  useEffect(() => {
    if (userId) {
      loadUserProfile();
      loadConnectionStatus();
      recordProfileVisit();
    }
  }, [userId]);

  async function recordProfileVisit() {
    if (!userId) return;
    
    try {
      await fetch("/api/profile/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitedUserId: userId }),
      });
    } catch (error) {
      console.error("Error recording profile visit:", error);
      // Silently fail - don't interrupt user experience
    }
  }

  async function loadUserProfile() {
    if (!userId) return;

    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.status === 401) {
        router.push(localeLink("/login", locale));
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        const error = await res.json();
        alert(error.error || (locale === "en" ? "User not found" : locale === "me" ? "Korisnik nije pronađen" : locale === "sq" ? "Përdoruesi nuk u gjet" : "Utente non trovato"));
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      alert(locale === "en" ? "Error loading user profile" : locale === "me" ? "Greška pri učitavanju profila" : locale === "sq" ? "Gabim gjatë ngarkimit të profilit" : "Errore durante il caricamento del profilo");
    } finally {
      setLoading(false);
    }
  }

  async function loadConnectionStatus() {
    if (!userId) return;

    try {
      const res = await fetch("/api/connections");
      if (res.ok) {
        const data = await res.json();
        const connection = data.connections?.find(
          (conn: any) => 
            (conn.user?._id === userId && conn.status === "accepted") ||
            (conn.connection?._id === userId && conn.status === "accepted")
        );
        if (connection) {
          setConnectionStatus(connection.status);
          setConnectionId(connection._id);
        } else {
          // Check for pending requests
          const pendingConnection = data.connections?.find(
            (conn: any) => conn.user?._id === userId || conn.connection?._id === userId
          );
          if (pendingConnection) {
            setConnectionStatus(pendingConnection.status);
            setConnectionId(pendingConnection._id);
          } else {
            setConnectionStatus(null);
            setConnectionId(null);
          }
        }
      }
    } catch (error) {
      console.error("Error loading connection status:", error);
    }
  }

  async function handleSendRequest() {
    if (!userId) return;

    setSending(true);
    try {
      const res = await fetch("/api/connections/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: userId }),
      });

      if (res.ok) {
        setConnectionStatus("pending");
      } else {
        const error = await res.json();
        alert(error.error || (locale === "en" ? "Failed to send connection request" : locale === "me" ? "Neuspješno slanje zahtjeva za povezivanje" : locale === "sq" ? "Dështoi dërgimi i kërkesës për lidhje" : "Impossibile inviare la richiesta di connessione"));
      }
    } catch (error) {
      console.error("Error sending connection request:", error);
      alert(locale === "en" ? "Error sending connection request" : locale === "me" ? "Greška pri slanju zahtjeva za povezivanje" : locale === "sq" ? "Gabim gjatë dërgimit të kërkesës për lidhje" : "Errore durante l'invio della richiesta di connessione");
    } finally {
      setSending(false);
    }
  }

  function formatDate(dateValue?: string | Date) {
    if (!dateValue) return "";
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  }

  function getConnectionButton() {
    if (connectionStatus === "accepted") {
      return (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Link
            href={localeLink(`/chat?userId=${userId}`, locale)}
            style={{
              padding: "8px 24px",
              background: "#0a66c2",
              color: "white",
              borderRadius: "24px",
              fontSize: "14px",
              fontWeight: "500",
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#004182";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0a66c2";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {t.profile.sendMessage}
          </Link>
          <span
            style={{
              padding: "8px 24px",
              background: "#e3f0ff",
              color: "#0a66c2",
              borderRadius: "24px",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            {t.profile.connected}
          </span>
          <button
            onClick={async () => {
              if (confirm(t.profile.areYouSureRemove)) {
                setRemoving(true);
                try {
                  const res = await fetch("/api/connections/remove", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ connectionId }),
                  });
                  if (res.ok) {
                    setConnectionStatus(null);
                    setConnectionId(null);
                    await loadConnectionStatus();
                  } else {
                    const error = await res.json();
                    alert(error.error || "Failed to remove connection");
                  }
                } catch (error) {
                  console.error("Error removing connection:", error);
                  alert("Error removing connection");
                } finally {
                  setRemoving(false);
                }
              }
            }}
            disabled={removing || !connectionId}
            style={{
              padding: "8px 16px",
              border: "1px solid #e63946",
              background: "white",
              color: "#e63946",
              borderRadius: "24px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: (removing || !connectionId) ? "not-allowed" : "pointer",
              opacity: (removing || !connectionId) ? 0.6 : 1,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!removing && connectionId) {
                e.currentTarget.style.background = "#ffe0e0";
                e.currentTarget.style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!removing && connectionId) {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.transform = "scale(1)";
              }
            }}
          >
            {removing ? t.profile.removing : t.profile.removeConnection}
          </button>
        </div>
      );
    }

    if (connectionStatus === "pending") {
      return (
        <span
          style={{
            padding: "8px 24px",
            background: "#fff3cd",
            color: "#856404",
            borderRadius: "24px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {t.profile.requestPending}
        </span>
      );
    }

    return (
      <button
        onClick={handleSendRequest}
        disabled={sending}
        style={{
          padding: "8px 24px",
          border: "1px solid #0a66c2",
          background: "white",
          color: "#0a66c2",
          borderRadius: "24px",
          cursor: sending ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "600",
          opacity: sending ? 0.6 : 1,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (!sending) {
            e.currentTarget.style.background = "#e3f0ff";
            e.currentTarget.style.transform = "scale(1.05)";
          }
        }}
        onMouseLeave={(e) => {
          if (!sending) {
            e.currentTarget.style.background = "white";
            e.currentTarget.style.transform = "scale(1)";
          }
        }}
      >
        {sending ? t.profile.sending : t.profile.connect}
      </button>
    );
  }

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

  if (!user) {
    return (
      <main style={{ padding: "40px", textAlign: "center" }}>
        <p>User not found.</p>
      </main>
    );
  }

  return (
    <main style={{ background: "#f3f2ef", minHeight: "100vh", paddingTop: "20px" }}>
      <div style={{ maxWidth: "1128px", margin: "0 auto", padding: "0 24px" }}>
        {/* Profile Header */}
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            marginBottom: "16px",
            overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
          }}
        >
          {/* Cover Image */}
          <div
            style={{
              height: "200px",
              background: user.coverImage
                ? `url(${user.coverImage}) center/cover`
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          />

          {/* Profile Info */}
          <div style={{ padding: "0 24px 24px", marginTop: "-72px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                {/* Profile Picture */}
                <div
                  style={{
                    position: "relative",
                    width: "168px",
                    height: "168px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "168px",
                      height: "168px",
                      borderRadius: "50%",
                      border: "4px solid white",
                      background: user.profilePicture
                        ? `url(${user.profilePicture}) center/cover`
                        : "#e4e4e4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "64px",
                      color: "#666",
                    }}
                  >
                    {!user.profilePicture &&
                      (user.displayName || user.username)?.[0]?.toUpperCase()}
                  </div>
                  {userId && <UserStatus userId={userId} size="large" />}
                </div>

                <h1 style={{ fontSize: "32px", fontWeight: "600", margin: "12px 0 4px" }}>
                  {user.displayName || user.username}
                </h1>

                <p style={{ fontSize: "16px", color: "#666", margin: "4px 0" }}>
                  {user.headline || user.role_custom || user.organization || "Member"}
                </p>

                {(user.location || user.organization) && (
                  <p style={{ fontSize: "14px", color: "#666", margin: "4px 0" }}>
                    {user.location}
                    {user.location && user.organization && " • "}
                    {user.organization}
                  </p>
                )}
              </div>
              <div>{getConnectionButton()}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "16px" }}>
          {/* Main Content */}
          <div>
            {/* About */}
            {user.about && (
              <div
                style={{
                  background: "white",
                  borderRadius: "8px",
                  padding: "24px",
                  marginBottom: "16px",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                }}
              >
                <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
                  About
                </h2>
                <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#666" }}>
                  {user.about}
                </p>
              </div>
            )}

            {/* Experience */}
            {user.experience && user.experience.length > 0 && (
              <div
                style={{
                  background: "white",
                  borderRadius: "8px",
                  padding: "24px",
                  marginBottom: "16px",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                }}
              >
                <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
                  Experience
                </h2>
                <div>
                  {user.experience.map((exp: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom: "16px",
                        paddingBottom: "16px",
                        borderBottom: "1px solid #e0e0e0",
                      }}
                    >
                      <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>
                        {exp.title}
                      </h3>
                      <p style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                        {exp.company}
                      </p>
                      <p style={{ fontSize: "12px", color: "#999" }}>
                        {formatDate(exp.startDate)} - {exp.current ? "Present" : formatDate(exp.endDate)}
                      </p>
                      {exp.description && (
                        <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {user.education && user.education.length > 0 && (
              <div
                style={{
                  background: "white",
                  borderRadius: "8px",
                  padding: "24px",
                  marginBottom: "16px",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                }}
              >
                <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
                  Education
                </h2>
                <div>
                  {user.education.map((edu: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom: "16px",
                        paddingBottom: "16px",
                        borderBottom: "1px solid #e0e0e0",
                      }}
                    >
                      <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>
                        {edu.school}
                      </h3>
                      {edu.degree && (
                        <p style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                          {edu.degree} {edu.field && `in ${edu.field}`}
                        </p>
                      )}
                      <p style={{ fontSize: "12px", color: "#999" }}>
                        {formatDate(edu.startDate)} - {edu.current ? "Present" : formatDate(edu.endDate)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Skills */}
            {user.skills && user.skills.length > 0 && (
              <div
                style={{
                  background: "white",
                  borderRadius: "8px",
                  padding: "24px",
                  marginBottom: "16px",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                }}
              >
                <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
                  Skills
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {user.skills.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      style={{
                        padding: "6px 12px",
                        background: "#e3f0ff",
                        color: "#0a66c2",
                        borderRadius: "16px",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                padding: "24px",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
                Contact Info
              </h2>
              <div style={{ fontSize: "14px", color: "#666" }}>
                {user.email && <p style={{ marginBottom: "8px" }}>📧 {user.email}</p>}
                {user.phone && <p style={{ marginBottom: "8px" }}>📱 {user.phone}</p>}
                {user.website && (
                  <p style={{ marginBottom: "8px" }}>
                    🌐{" "}
                    <a
                      href={user.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#0a66c2" }}
                    >
                      {user.website}
                    </a>
                  </p>
                )}
                {user.linkedin && (
                  <p style={{ marginBottom: "8px" }}>
                    💼{" "}
                    <a
                      href={user.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#0a66c2" }}
                    >
                      LinkedIn
                    </a>
                  </p>
                )}
                {user.twitter && (
                  <p style={{ marginBottom: "8px" }}>
                    🐦{" "}
                    <a
                      href={user.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#0a66c2" }}
                    >
                      Twitter
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Resolve params using use() hook for Client Components
  const resolvedParams = use(params);
  
  // Next.js requires useSearchParams() to be used under a Suspense boundary
  return (
    <Suspense fallback={null}>
      <UserProfilePageInner params={Promise.resolve(resolvedParams)} />
    </Suspense>
  );
}
