"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { localeLink, type Locale } from "@/lib/localeLink";

interface User {
  _id?: string;
  username: string;
  email: string;
  displayName?: string;
  headline?: string;
  about?: string;
  organization?: string;
  location?: string;
  role_custom?: string;
  interests?: string;
  profilePicture?: string;
  coverImage?: string;
  experience?: any[];
  education?: any[];
  skills?: string[];
  website?: string;
  phone?: string;
  linkedin?: string;
  twitter?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [showEduModal, setShowEduModal] = useState(false);
  const [editingExp, setEditingExp] = useState<any>(null);
  const [editingEdu, setEditingEdu] = useState<any>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [processingConnection, setProcessingConnection] = useState<string | null>(null);
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

  // Helper function for button animations
  const buttonAnimations = {
    style: {
      transition: "all 0.2s ease",
    },
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "scale(1.05)";
      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.boxShadow = "none";
    },
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "scale(0.95)";
    },
    onMouseUp: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "scale(1.05)";
    },
  };

  const primaryButtonAnimations = {
    ...buttonAnimations,
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "scale(1.05)";
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(10, 102, 194, 0.3)";
    },
  };

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function checkAuthAndLoad() {
    try {
      // First check if user is authenticated
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      
      if (!authData.user) {
        // User not authenticated, redirect to login
        router.push(localeLink("/login", locale));
        return;
      }
      
      // User is authenticated, load profile
      await loadProfile();
      await loadConnections();
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push(localeLink("/login", locale));
    }
  }

  async function loadProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.status === 401) {
        router.push(localeLink("/login", locale));
        return;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Error loading profile:", res.status, errorData);
        if (res.status === 404) {
          router.push(localeLink("/login", locale));
          return;
        }
        return;
      }
      const data = await res.json();
      if (data.error) {
        console.error("API error:", data.error);
        if (data.error === "Unauthorized" || data.error.includes("Unauthorized")) {
          router.push(localeLink("/login", locale));
          return;
        }
        return;
      }
      setUser(data);
      setFormData(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setEditing(false);
        // Profile updated successfully - no alert needed
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error saving profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(file: File, type: "cover" | "profile") {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (type === "cover") {
      setUploadingCover(true);
    } else {
      setUploadingProfile(true);
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const res = await fetch("/api/profile/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (res.ok) {
        const data = await res.json();
        const updatedFormData = {
          ...formData,
          [type === "cover" ? "coverImage" : "profilePicture"]: data.url,
        };
        setFormData(updatedFormData);
        
        // Auto-save after upload
        const saveRes = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedFormData),
        });
        
        if (saveRes.ok) {
          const updated = await saveRes.json();
          setUser(updated);
          // Image uploaded successfully - no alert needed
        } else {
          const error = await saveRes.json();
          alert(`Error saving: ${error.error}`);
        }
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error uploading image");
    } finally {
      if (type === "cover") {
        setUploadingCover(false);
      } else {
        setUploadingProfile(false);
      }
    }
  }

  function formatDate(dateValue?: string | Date) {
    if (!dateValue) return "";
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  }

  async function loadConnections() {
    setLoadingConnections(true);
    try {
      const res = await fetch("/api/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      } else {
        console.error("Failed to load connections:", res.status);
      }
    } catch (error) {
      console.error("Error loading connections:", error);
    } finally {
      setLoadingConnections(false);
    }
  }

  async function handleAcceptConnection(connectionId: string) {
    setProcessingConnection(connectionId);
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
      setProcessingConnection(null);
    }
  }

  async function handleDeclineConnection(connectionId: string) {
    setProcessingConnection(connectionId);
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
      setProcessingConnection(null);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      
      // Clear all caches
      sessionStorage.removeItem("header-current-user");
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear user state
      setUser(null);
      
      // Dispatch logout event for other components
      window.dispatchEvent(new Event("user-logged-out"));
      
      // Force page reload to clear all state
      window.location.href = localeLink("/login", locale);
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Error logging out");
    }
  }

  const pendingRequests = connections.filter(
    (conn) => conn.status === "pending" && conn.isIncoming === true
  );
  
  const acceptedConnections = connections.filter(
    (conn) => conn.status === "accepted"
  );

  if (loading) {
    return (
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
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Please log in to view your profile.</p>
        <Link href="/login">Login</Link>
      </div>
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
              position: "relative",
            }}
          >
            {editing && (
              <div style={{ position: "absolute", bottom: "16px", right: "16px" }}>
                <label
                  style={{
                    background: "white",
                    padding: "8px 16px",
                    borderRadius: "24px",
                    cursor: uploadingCover ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    display: "inline-block",
                    opacity: uploadingCover ? 0.6 : 1,
                  }}
                >
                  {uploadingCover ? "Uploading..." : "Change cover"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, "cover");
                      }
                    }}
                    disabled={uploadingCover}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div style={{ padding: "0 24px 24px", marginTop: "-72px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                {/* Profile Picture */}
                <div style={{ position: "relative", display: "inline-block" }}>
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
                      marginBottom: "12px",
                      position: "relative",
                    }}
                  >
                    {!user.profilePicture && (user.displayName || user.username)?.[0]?.toUpperCase()}
                    {editing && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "12px",
                          right: "0",
                          background: "#0a66c2",
                          borderRadius: "50%",
                          width: "40px",
                          height: "40px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: uploadingProfile ? "not-allowed" : "pointer",
                          opacity: uploadingProfile ? 0.6 : 1,
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!uploadingProfile) {
                            e.currentTarget.style.transform = "scale(1.1)";
                            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!uploadingProfile) {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                          }
                        }}
                        onMouseDown={(e) => {
                          if (!uploadingProfile) {
                            e.currentTarget.style.transform = "scale(0.95)";
                          }
                        }}
                        onMouseUp={(e) => {
                          if (!uploadingProfile) {
                            e.currentTarget.style.transform = "scale(1.1)";
                          }
                        }}
                      >
                        <label
                          style={{
                            cursor: uploadingProfile ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "100%",
                          }}
                        >
                          {uploadingProfile ? (
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                border: "2px solid white",
                                borderTop: "2px solid transparent",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                              }}
                            />
                          ) : (
                            <span style={{ color: "white", fontSize: "20px" }}>📷</span>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(file, "profile");
                              }
                            }}
                            disabled={uploadingProfile}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <h1 style={{ fontSize: "32px", fontWeight: "600", margin: "12px 0 4px" }}>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.displayName || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, displayName: e.target.value })
                      }
                      placeholder="Full Name"
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "32px",
                        fontWeight: "600",
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
                  ) : (
                    user.displayName || user.username
                  )}
                </h1>

                {editing ? (
                  <input
                    type="text"
                    value={formData.headline || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, headline: e.target.value })
                    }
                    placeholder="Headline (e.g., Software Engineer at Company)"
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "16px",
                      marginTop: "4px",
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
                ) : (
                  <p style={{ fontSize: "16px", color: "#666", margin: "4px 0" }}>
                    {user.headline || user.role_custom || user.organization || "Member"}
                  </p>
                )}

                <p style={{ fontSize: "14px", color: "#666", margin: "4px 0" }}>
                  {user.location && `📍 ${user.location}`}
                  {user.location && user.organization && " • "}
                  {user.organization && user.organization}
                </p>
              </div>

              <div>
                {editing ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setFormData(user);
                      }}
                      style={{
                        padding: "8px 24px",
                        border: "1px solid #666",
                        background: "white",
                        borderRadius: "24px",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f5f5f5";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = "scale(0.95)";
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        padding: "8px 24px",
                        border: "none",
                        background: "#0a66c2",
                        color: "white",
                        borderRadius: "24px",
                        cursor: saving ? "not-allowed" : "pointer",
                        fontSize: "16px",
                        fontWeight: "600",
                        opacity: saving ? 0.6 : 1,
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) {
                          e.currentTarget.style.background = "#004182";
                          e.currentTarget.style.transform = "scale(1.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!saving) {
                          e.currentTarget.style.background = "#0a66c2";
                          e.currentTarget.style.transform = "scale(1)";
                        }
                      }}
                      onMouseDown={(e) => {
                        if (!saving) {
                          e.currentTarget.style.transform = "scale(0.95)";
                        }
                      }}
                      onMouseUp={(e) => {
                        if (!saving) {
                          e.currentTarget.style.transform = "scale(1.05)";
                        }
                      }}
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <button
                      onClick={() => setEditing(true)}
                      style={{
                        padding: "8px 24px",
                        border: "1px solid #0a66c2",
                        background: "white",
                        color: "#0a66c2",
                        borderRadius: "24px",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#e3f0ff";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = "scale(0.95)";
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                    >
                      Edit profile
                    </button>
                    <button
                      onClick={handleLogout}
                      style={{
                        padding: "8px 24px",
                        border: "1px solid #dc3545",
                        background: "white",
                        color: "#dc3545",
                        borderRadius: "24px",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#ffe3e3";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = "scale(0.95)";
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "16px" }}>
          {/* Main Content */}
          <div>
            {/* About */}
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
              {editing ? (
                <textarea
                  value={formData.about || ""}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={6}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              ) : (
                <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#666" }}>
                  {user.about || "No about section yet."}
                </p>
              )}
            </div>

            {/* Experience */}
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                padding: "24px",
                marginBottom: "16px",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                animation: "fadeIn 0.3s ease-out",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "600" }}>Experience</h2>
                {editing && (
                  <button
                    onClick={() => {
                      setEditingExp(null);
                      setShowExpModal(true);
                    }}
                    style={{
                      padding: "6px 16px",
                      border: "1px solid #0a66c2",
                      background: "white",
                      color: "#0a66c2",
                      borderRadius: "24px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    + Add
                  </button>
                )}
              </div>
              {user.experience && user.experience.length > 0 ? (
                <div>
                  {user.experience.map((exp: any, idx: number) => (
                    <div 
                      key={idx} 
                      style={{ 
                        marginBottom: "16px", 
                        paddingBottom: "16px", 
                        borderBottom: "1px solid #e0e0e0",
                        animation: `fadeIn 0.3s ease-out ${idx * 0.1}s both`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
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
                        {editing && (
                          <div>
                            <button
                              onClick={() => {
                                setEditingExp(exp);
                                setShowExpModal(true);
                              }}
                              style={{
                                padding: "4px 12px",
                                border: "1px solid #ddd",
                                background: "white",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                marginRight: "4px",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#e3f0ff";
                                e.currentTarget.style.borderColor = "#0a66c2";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "white";
                                e.currentTarget.style.borderColor = "#ddd";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                              onMouseDown={(e) => {
                                e.currentTarget.style.transform = "scale(0.95)";
                              }}
                              onMouseUp={(e) => {
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                const newExp = (formData.experience || []).filter((_: any, i: number) => i !== idx);
                                setFormData({ ...formData, experience: newExp });
                              }}
                              style={{
                                padding: "4px 12px",
                                border: "1px solid #ddd",
                                background: "white",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                color: "#d32f2f",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#ffebee";
                                e.currentTarget.style.borderColor = "#d32f2f";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "white";
                                e.currentTarget.style.borderColor = "#ddd";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                              onMouseDown={(e) => {
                                e.currentTarget.style.transform = "scale(0.95)";
                              }}
                              onMouseUp={(e) => {
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "14px", color: "#666" }}>No experience added yet.</p>
              )}
            </div>

            {/* Education */}
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                padding: "24px",
                marginBottom: "16px",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "600" }}>Education</h2>
                {editing && (
                  <button
                    onClick={() => {
                      setEditingEdu(null);
                      setShowEduModal(true);
                    }}
                    style={{
                      padding: "6px 16px",
                      border: "1px solid #0a66c2",
                      background: "white",
                      color: "#0a66c2",
                      borderRadius: "24px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#e3f0ff";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = "scale(0.95)";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                  >
                    + Add
                  </button>
                )}
              </div>
              {user.education && user.education.length > 0 ? (
                <div>
                  {user.education.map((edu: any, idx: number) => (
                    <div 
                      key={idx} 
                      style={{ 
                        marginBottom: "16px", 
                        paddingBottom: "16px", 
                        borderBottom: "1px solid #e0e0e0",
                        animation: `fadeIn 0.3s ease-out ${idx * 0.1}s both`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
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
                        {editing && (
                          <div>
                            <button
                              onClick={() => {
                                setEditingEdu(edu);
                                setShowEduModal(true);
                              }}
                              style={{
                                padding: "4px 12px",
                                border: "1px solid #ddd",
                                background: "white",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                marginRight: "4px",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#e3f0ff";
                                e.currentTarget.style.borderColor = "#0a66c2";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "white";
                                e.currentTarget.style.borderColor = "#ddd";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                              onMouseDown={(e) => {
                                e.currentTarget.style.transform = "scale(0.95)";
                              }}
                              onMouseUp={(e) => {
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                const newEdu = (formData.education || []).filter((_: any, i: number) => i !== idx);
                                setFormData({ ...formData, education: newEdu });
                              }}
                              style={{
                                padding: "4px 12px",
                                border: "1px solid #ddd",
                                background: "white",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                color: "#d32f2f",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#ffebee";
                                e.currentTarget.style.borderColor = "#d32f2f";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "white";
                                e.currentTarget.style.borderColor = "#ddd";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                              onMouseDown={(e) => {
                                e.currentTarget.style.transform = "scale(0.95)";
                              }}
                              onMouseUp={(e) => {
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "14px", color: "#666" }}>No education added yet.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Skills */}
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                padding: "24px",
                marginBottom: "16px",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "600" }}>Skills</h2>
              </div>
              {editing ? (
                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                    {(formData.skills || []).map((skill: string, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          padding: "6px 12px",
                          background: "#e3f0ff",
                          color: "#0a66c2",
                          borderRadius: "16px",
                          fontSize: "14px",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {skill}
                        <button
                          onClick={() => {
                            const newSkills = (formData.skills || []).filter((_: string, i: number) => i !== idx);
                            setFormData({ ...formData, skills: newSkills });
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#0a66c2",
                            cursor: "pointer",
                            fontSize: "16px",
                            padding: 0,
                            lineHeight: 1,
                            transition: "all 0.2s ease",
                            width: "20px",
                            height: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#0a66c2";
                            e.currentTarget.style.color = "white";
                            e.currentTarget.style.transform = "scale(1.2) rotate(90deg)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#0a66c2";
                            e.currentTarget.style.transform = "scale(1) rotate(0deg)";
                          }}
                          onMouseDown={(e) => {
                            e.currentTarget.style.transform = "scale(0.9) rotate(90deg)";
                          }}
                          onMouseUp={(e) => {
                            e.currentTarget.style.transform = "scale(1.2) rotate(90deg)";
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      placeholder="Add skill"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value.trim()) {
                          const newSkills = [...(formData.skills || []), e.currentTarget.value.trim()];
                          setFormData({ ...formData, skills: newSkills });
                          e.currentTarget.value = "";
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
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
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input && input.value.trim()) {
                          const newSkills = [...(formData.skills || []), input.value.trim()];
                          setFormData({ ...formData, skills: newSkills });
                          input.value = "";
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        border: "1px solid #0a66c2",
                        background: "white",
                        color: "#0a66c2",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#0a66c2";
                        e.currentTarget.style.color = "white";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.color = "#0a66c2";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = "scale(0.95)";
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {user.skills && user.skills.length > 0 ? (
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
                  ) : (
                    <p style={{ fontSize: "14px", color: "#666" }}>No skills added yet.</p>
                  )}
                </>
              )}
            </div>

            {/* Connection Requests */}
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
                Connection Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
              </h2>
              {loadingConnections ? (
                <p style={{ fontSize: "14px", color: "#666" }}>Loading...</p>
              ) : pendingRequests.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {pendingRequests.map((conn) => (
                    <div
                      key={conn._id}
                      style={{
                        padding: "12px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                      }}
                    >
                      <div style={{ marginBottom: "8px" }}>
                        <Link
                          href={localeLink(`/user-profile?id=${conn.user?._id}`, (() => {
                            const match = pathname?.match(/^\/([^\/]+)/);
                            if (match && ["me", "en", "it", "sq"].includes(match[1])) {
                              return match[1] as Locale;
                            }
                            return "me";
                          })())}
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#0a66c2",
                            textDecoration: "none",
                          }}
                        >
                          {conn.user?.displayName || conn.user?.username}
                        </Link>
                        {conn.user?.headline && (
                          <p style={{ fontSize: "12px", color: "#666", margin: "4px 0 0" }}>
                            {conn.user.headline}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleAcceptConnection(conn._id)}
                          disabled={processingConnection === conn._id}
                          style={{
                            flex: 1,
                            padding: "6px 12px",
                            border: "none",
                            background: "#0a66c2",
                            color: "white",
                            borderRadius: "16px",
                            cursor: processingConnection === conn._id ? "not-allowed" : "pointer",
                            fontSize: "12px",
                            fontWeight: "600",
                            opacity: processingConnection === conn._id ? 0.6 : 1,
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (processingConnection !== conn._id) {
                              e.currentTarget.style.background = "#004182";
                              e.currentTarget.style.transform = "scale(1.05)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (processingConnection !== conn._id) {
                              e.currentTarget.style.background = "#0a66c2";
                              e.currentTarget.style.transform = "scale(1)";
                            }
                          }}
                        >
                          {processingConnection === conn._id ? "..." : "Accept"}
                        </button>
                        <button
                          onClick={() => handleDeclineConnection(conn._id)}
                          disabled={processingConnection === conn._id}
                          style={{
                            flex: 1,
                            padding: "6px 12px",
                            border: "1px solid #ddd",
                            background: "white",
                            color: "#666",
                            borderRadius: "16px",
                            cursor: processingConnection === conn._id ? "not-allowed" : "pointer",
                            fontSize: "12px",
                            fontWeight: "600",
                            opacity: processingConnection === conn._id ? 0.6 : 1,
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (processingConnection !== conn._id) {
                              e.currentTarget.style.background = "#f5f5f5";
                              e.currentTarget.style.transform = "scale(1.05)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (processingConnection !== conn._id) {
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
                <p style={{ fontSize: "14px", color: "#666" }}>No pending connection requests.</p>
              )}
            </div>

            {/* My Connections */}
            {acceptedConnections.length > 0 && (
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
                  My Connections ({acceptedConnections.length})
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {(Array.isArray(acceptedConnections) ? acceptedConnections.slice(0, 5) : []).map((conn) => (
                    <div
                      key={conn._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: conn.user?.profilePicture
                            ? `url(${conn.user.profilePicture}) center/cover`
                            : "#e4e4e4",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                          color: "#666",
                        }}
                      >
                        {!conn.user?.profilePicture &&
                          (conn.user?.displayName || conn.user?.username)?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <Link
                          href={localeLink(`/user-profile?id=${conn.user?._id}`, (() => {
                            const match = pathname?.match(/^\/([^\/]+)/);
                            if (match && ["me", "en", "it", "sq"].includes(match[1])) {
                              return match[1] as Locale;
                            }
                            return "me";
                          })())}
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#0a66c2",
                            textDecoration: "none",
                          }}
                        >
                          {conn.user?.displayName || conn.user?.username}
                        </Link>
                        {conn.user?.headline && (
                          <p style={{ fontSize: "12px", color: "#666", margin: "2px 0 0" }}>
                            {conn.user.headline}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/chat?userId=${conn.user?._id}`}
                        style={{
                          padding: "6px 12px",
                          border: "1px solid #0a66c2",
                          background: "white",
                          color: "#0a66c2",
                          borderRadius: "16px",
                          fontSize: "12px",
                          fontWeight: "600",
                          textDecoration: "none",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#0a66c2";
                          e.currentTarget.style.color = "white";
                          e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.color = "#0a66c2";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        Message
                      </Link>
                    </div>
                  ))}
                  {acceptedConnections.length > 5 && (
                    <Link
                      href="/connection-requests"
                      style={{
                        fontSize: "14px",
                        color: "#0a66c2",
                        textDecoration: "none",
                        textAlign: "center",
                        padding: "8px",
                        fontWeight: "600",
                      }}
                    >
                      View all connections ({acceptedConnections.length})
                    </Link>
                  )}
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
              {editing ? (
                <div style={{ fontSize: "14px" }}>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", color: "#666" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email || ""}
                      disabled
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                        background: "#f5f5f5",
                        color: "#999",
                      }}
                    />
                    <p style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>Email cannot be changed</p>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", color: "#666" }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1234567890"
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", color: "#666" }}>
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website || ""}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://example.com"
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", color: "#666" }}>
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      value={formData.linkedin || ""}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", color: "#666" }}>
                      Twitter
                    </label>
                    <input
                      type="url"
                      value={formData.twitter || ""}
                      onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                      placeholder="https://twitter.com/username"
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "14px", color: "#666" }}>
                  {user.email && <p style={{ marginBottom: "8px" }}>📧 {user.email}</p>}
                  {user.phone && <p style={{ marginBottom: "8px" }}>📱 {user.phone}</p>}
                  {user.website && (
                    <p style={{ marginBottom: "8px" }}>
                      🌐 <a href={user.website} target="_blank" rel="noopener noreferrer" style={{ color: "#0a66c2" }}>
                        {user.website}
                      </a>
                    </p>
                  )}
                  {user.linkedin && (
                    <p style={{ marginBottom: "8px" }}>
                      💼 <a href={user.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: "#0a66c2" }}>
                        LinkedIn
                      </a>
                    </p>
                  )}
                  {user.twitter && (
                    <p style={{ marginBottom: "8px" }}>
                      🐦 <a href={user.twitter} target="_blank" rel="noopener noreferrer" style={{ color: "#0a66c2" }}>
                        Twitter
                      </a>
                    </p>
                  )}
                  {!user.phone && !user.website && !user.linkedin && !user.twitter && (
                    <p style={{ fontSize: "14px", color: "#666" }}>No contact info added yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Experience Modal */}
      {showExpModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={() => {
            setShowExpModal(false);
            setEditingExp(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: "scaleIn 0.2s ease-out",
            }}
          >
            <ExperienceModal
          experience={editingExp}
          onClose={() => {
            setShowExpModal(false);
            setEditingExp(null);
          }}
          onSave={(exp) => {
            let newExp = [...(formData.experience || [])];
            if (editingExp) {
              const idx = (formData.experience || []).findIndex((e: any) => e === editingExp);
              if (idx >= 0) {
                newExp[idx] = exp;
              }
            } else {
              newExp.push(exp);
            }
            setFormData({ ...formData, experience: newExp });
            setShowExpModal(false);
            setEditingExp(null);
          }}
            />
          </div>
        </div>
      )}

      {/* Education Modal */}
      {showEduModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={() => {
            setShowEduModal(false);
            setEditingEdu(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: "scaleIn 0.2s ease-out",
            }}
          >
            <EducationModal
          education={editingEdu}
          onClose={() => {
            setShowEduModal(false);
            setEditingEdu(null);
          }}
          onSave={(edu) => {
            let newEdu = [...(formData.education || [])];
            if (editingEdu) {
              const idx = (formData.education || []).findIndex((e: any) => e === editingEdu);
              if (idx >= 0) {
                newEdu[idx] = edu;
              }
            } else {
              newEdu.push(edu);
            }
            setFormData({ ...formData, education: newEdu });
            setShowEduModal(false);
            setEditingEdu(null);
          }}
            />
          </div>
        </div>
      )}
    </main>
  );
}

// Experience Modal Component
function ExperienceModal({
  experience,
  onClose,
  onSave,
}: {
  experience: any;
  onClose: () => void;
  onSave: (exp: any) => void;
}) {
  const [formData, setFormData] = useState({
    title: experience?.title || "",
    company: experience?.company || "",
    location: experience?.location || "",
    startDate: experience?.startDate || "",
    endDate: experience?.endDate || "",
    current: experience?.current || false,
    description: experience?.description || "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(formData);
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: "8px",
        padding: "24px",
        width: "90%",
        maxWidth: "500px",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "24px" }}>
        {experience ? "Edit Experience" : "Add Experience"}
      </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
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
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
              Company *
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
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
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
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
          <div style={{ marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
                Start Date *
              </label>
              <input
                type="month"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
                End Date
              </label>
              <input
                type="month"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={formData.current}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  opacity: formData.current ? 0.5 : 1,
                }}
              />
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
              <input
                type="checkbox"
                checked={formData.current}
                onChange={(e) => setFormData({ ...formData, current: e.target.checked, endDate: e.target.checked ? "" : formData.endDate })}
              />
              I currently work here
            </label>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 24px",
                border: "1px solid #666",
                background: "white",
                borderRadius: "24px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 24px",
                border: "none",
                background: "#0a66c2",
                color: "white",
                borderRadius: "24px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#004182";
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(10, 102, 194, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0a66c2";
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "scale(0.95)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    );
}

// Education Modal Component
function EducationModal({
  education,
  onClose,
  onSave,
}: {
  education: any;
  onClose: () => void;
  onSave: (edu: any) => void;
}) {
  const [formData, setFormData] = useState({
    school: education?.school || "",
    degree: education?.degree || "",
    field: education?.field || "",
    startDate: education?.startDate || "",
    endDate: education?.endDate || "",
    current: education?.current || false,
    description: education?.description || "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(formData);
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: "8px",
        padding: "24px",
        width: "90%",
        maxWidth: "500px",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "24px" }}>
          {education ? "Edit Education" : "Add Education"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
              School *
            </label>
            <input
              type="text"
              value={formData.school}
              onChange={(e) => setFormData({ ...formData, school: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
              Degree
            </label>
            <input
              type="text"
              value={formData.degree}
              onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
              Field of Study
            </label>
            <input
              type="text"
              value={formData.field}
              onChange={(e) => setFormData({ ...formData, field: e.target.value })}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>
          <div style={{ marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
                Start Date *
              </label>
              <input
                type="month"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
                End Date
              </label>
              <input
                type="month"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={formData.current}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  opacity: formData.current ? 0.5 : 1,
                }}
              />
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
              <input
                type="checkbox"
                checked={formData.current}
                onChange={(e) => setFormData({ ...formData, current: e.target.checked, endDate: e.target.checked ? "" : formData.endDate })}
              />
              I currently study here
            </label>
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 24px",
                border: "1px solid #666",
                background: "white",
                borderRadius: "24px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 24px",
                border: "none",
                background: "#0a66c2",
                color: "white",
                borderRadius: "24px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    );
}
