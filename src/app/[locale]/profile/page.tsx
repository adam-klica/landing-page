"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { localeLink, type Locale } from "@/lib/localeLink";
import { getTranslations } from "@/lib/getTranslations";
import { getTranslatedText, getTranslatedField } from "@/lib/getTranslatedText";

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
  country?: string;
  city?: string;
  region?: string;
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = use(params);
  const locale = (resolvedParams.locale as Locale) || "me";
  const t = getTranslations(locale);
  
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileVisitors, setProfileVisitors] = useState<any[]>([]);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connectionsSearchTerm, setConnectionsSearchTerm] = useState("");
  const [connectionsSortBy, setConnectionsSortBy] = useState<"recently" | "firstName" | "lastName">("recently");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showConnectionMenu, setShowConnectionMenu] = useState<string | null>(null);
  const [removingConnection, setRemovingConnection] = useState<string | null>(null);
  const router = useRouter();



  // Helper function to get card background style
  const getCardStyle = () => ({
    background: "white",
    color: "inherit",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
    transition: "background 0.3s ease, color 0.3s ease",
  });

  // Helper function to get input style
  const getInputStyle = () => ({
    background: "white",
    color: "inherit",
    border: "1px solid #ddd",
  });

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
      await loadProfileVisitors();
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
        if (data.error === "Unauthorized" || data.error === t.profile.unauthorized || data.error.includes("Unauthorized") || data.error.includes(t.profile.unauthorized)) {
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
      // Add locale to formData for auto-translation
      const dataToSend = {
        ...formData,
        locale: locale, // Send current locale so server knows source language
      };
      
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
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

  async function handleImageUpload(file: File, type: "cover" | "profile", inputElement?: HTMLInputElement) {
    if (!file.type.startsWith("image/")) {
      alert(locale === "en" ? "Please upload an image file" : locale === "me" ? "Molimo učitajte sliku" : locale === "sq" ? "Ju lutem ngarkoni një skedar imazhi" : "Si prega di caricare un file immagine");
      if (inputElement) inputElement.value = "";
      return;
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert(locale === "en" ? "Image size must be less than 5MB" : locale === "me" ? "Veličina slike mora biti manja od 5MB" : locale === "sq" ? "Madhësia e imazhit duhet të jetë më pak se 5MB" : "La dimensione dell'immagine deve essere inferiore a 5MB");
      if (inputElement) inputElement.value = "";
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
          // Update both user and formData with the new image URL
          setUser({
            ...updated,
            [type === "cover" ? "coverImage" : "profilePicture"]: data.url,
          });
          setFormData(updatedFormData);
        } else {
          const error = await saveRes.json();
          alert(`Error saving: ${error.error}`);
        }
      } else {
        const error = await res.json();
        alert(`${t.profile.error || "Error"}: ${error.error || t.profile.uploadFailed}`);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(locale === "en" ? "Error uploading image" : locale === "me" ? "Greška pri učitavanju slike" : locale === "sq" ? "Gabim gjatë ngarkimit të imazhit" : "Errore durante il caricamento dell'immagine");
    } finally {
      if (type === "cover") {
        setUploadingCover(false);
      } else {
        setUploadingProfile(false);
      }
      // Reset input to allow same file to be selected again
      if (inputElement) inputElement.value = "";
    }
  }

  function formatDate(dateValue?: string | Date) {
    if (!dateValue) return "";
    let date: Date;
    if (typeof dateValue === "string") {
      // Handle YYYY-MM format (month only)
      if (dateValue.match(/^\d{4}-\d{2}$/)) {
        date = new Date(dateValue + '-01');
      } else {
        date = new Date(dateValue);
      }
    } else {
      date = dateValue;
    }
    if (isNaN(date.getTime())) return "";
    // Format as dd/mm/yyyy
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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

  async function loadProfileVisitors() {
    setLoadingVisitors(true);
    try {
      const res = await fetch("/api/profile/visitors");
      if (res.ok) {
        const data = await res.json();
        setProfileVisitors(data.visitors || []);
      } else {
        console.error("Failed to load profile visitors:", res.status);
      }
    } catch (error) {
      console.error("Error loading profile visitors:", error);
    } finally {
      setLoadingVisitors(false);
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
        alert(error.error || (locale === "en" ? "Failed to accept request" : locale === "me" ? "Neuspješno prihvatanje zahtjeva" : locale === "sq" ? "Dështoi pranimi i kërkesës" : "Impossibile accettare la richiesta"));
      }
    } catch (error) {
      console.error("Error accepting connection:", error);
      alert(locale === "en" ? "Error accepting connection" : locale === "me" ? "Greška pri prihvatanju veze" : locale === "sq" ? "Gabim gjatë pranimit të lidhjes" : "Errore durante l'accettazione della connessione");
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
        alert(error.error || (locale === "en" ? "Failed to decline request" : locale === "me" ? "Neuspješno odbijanje zahtjeva" : locale === "sq" ? "Dështoi refuzimi i kërkesës" : "Impossibile rifiutare la richiesta"));
      }
    } catch (error) {
      console.error("Error declining connection:", error);
      alert(locale === "en" ? "Error declining connection" : locale === "me" ? "Greška pri odbijanju veze" : locale === "sq" ? "Gabim gjatë refuzimit të lidhjes" : "Errore durante il rifiuto della connessione");
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
      alert(locale === "en" ? "Error logging out" : locale === "me" ? "Greška pri odjavi" : locale === "sq" ? "Gabim gjatë daljes" : "Errore durante il logout");
    }
  }

  async function handleChangePassword() {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      alert(locale === "en" ? "Please fill in all fields" : locale === "me" ? "Molimo popunite sva polja" : locale === "sq" ? "Ju lutem plotësoni të gjitha fushat" : "Si prega di compilare tutti i campi");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert(locale === "en" ? "New passwords do not match" : locale === "me" ? "Nove lozinke se ne poklapaju" : locale === "sq" ? "Fjalëkalimet e rinj nuk përputhen" : "Le nuove password non corrispondono");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert(locale === "en" ? "New password must be at least 6 characters long" : locale === "me" ? "Nova lozinka mora imati najmanje 6 karaktera" : locale === "sq" ? "Fjalëkalimi i ri duhet të jetë së paku 6 karaktere" : "La nuova password deve essere di almeno 6 caratteri");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (res.ok) {
        alert("Password changed successfully");
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const error = await res.json();
        alert(error.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      alert("Error changing password. Please try again.");
    } finally {
      setChangingPassword(false);
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
        <p>{t.profile.pleaseLogin}</p>
        <Link href={localeLink("/login", locale)}>{t.common.login}</Link>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 1024px) {
          .profile-page-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .profile-page-grid > div:last-child {
            position: static !important;
          }
        }
        @media (max-width: 768px) {
          .profile-page-container {
            padding: 0 12px !important;
          }
          .profile-page-cover {
            height: 200px !important;
          }
          .profile-page-header-content {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          .profile-page-picture {
            width: 120px !important;
            height: 120px !important;
            font-size: 48px !important;
          }
          .profile-page-name {
            font-size: 24px !important;
          }
          .profile-page-headline {
            font-size: 14px !important;
          }
          .profile-page-actions {
            flex-direction: column !important;
            width: 100% !important;
            gap: 8px !important;
          }
          .profile-page-actions button {
            width: 100% !important;
          }
          .profile-page-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .profile-page-grid > div:last-child {
            position: static !important;
          }
          .profile-page-section {
            padding: 16px !important;
          }
          .profile-page-section h2 {
            font-size: 18px !important;
          }
          .profile-page-experience-item > div,
          .profile-page-education-item > div {
            flex-direction: column !important;
            gap: 8px !important;
          }
        }
        @media (max-width: 480px) {
          .profile-page-container {
            padding: 0 8px !important;
          }
          .profile-page-cover {
            height: 150px !important;
          }
          .profile-page-picture {
            width: 100px !important;
            height: 100px !important;
            font-size: 40px !important;
          }
          .profile-page-name {
            font-size: 20px !important;
          }
          .profile-page-section {
            padding: 12px !important;
          }
        }
      `}} />
    <main style={{ background: "#f5f5f5", minHeight: "100vh", paddingTop: "24px", paddingBottom: "60px" }}>
      <div className="profile-page-container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
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
            key={String(formData.coverImage || user.coverImage || 'no-cover')}
            className="profile-page-cover"
            style={{
              height: "300px",
              background: (() => {
                const coverImg = formData.coverImage || user.coverImage;
                if (!coverImg) return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                return `url(${coverImg}) center/cover`;
              })(),
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
                  {uploadingCover ? t.profile.uploading : t.profile.changeCover}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, "cover", e.target);
                      }
                    }}
                    disabled={uploadingCover}
                    style={{ display: "none" }}
                    id="cover-image-input"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div style={{ padding: "0 24px 24px", marginTop: "-72px" }}>
            <div className="profile-page-header-content" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                {/* Profile Picture */}
                <div style={{ position: "relative", display: "inline-block" }}>
                  <div
                    key={String(formData.profilePicture || user.profilePicture || 'no-image')}
                    className="profile-page-picture"
                    style={{
                      width: "168px",
                      height: "168px",
                      borderRadius: "50%",
                      border: "4px solid white",
                      background: (() => {
                        const profileImg = formData.profilePicture || user.profilePicture;
                        if (!profileImg) return "#e4e4e4";
                        return `url(${profileImg}) center/cover`;
                      })(),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "64px",
                      color: "#666",
                      marginBottom: "12px",
                      position: "relative",
                    }}
                  >
                    {!(formData.profilePicture || user.profilePicture) && (user.displayName || user.username)?.[0]?.toUpperCase()}
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
                                handleImageUpload(file, "profile", e.target);
                              }
                            }}
                            disabled={uploadingProfile}
                            style={{ display: "none" }}
                            id="profile-image-input"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <h1 className="profile-page-name" style={{ fontSize: "32px", fontWeight: "600", margin: "12px 0 4px" }}>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.displayName || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, displayName: e.target.value })
                      }
                      placeholder={t.join.fullName}
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
                    placeholder={t.profile.headline}
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
                  <p className="profile-page-headline" style={{ fontSize: "16px", color: "#666", margin: "4px 0" }}>
                    {getTranslatedText(user.headline, (user as any).headlineTranslations, locale) || user.role_custom || user.organization || t.profile.member}
                  </p>
                )}

                <p style={{ fontSize: "14px", color: "#666", margin: "4px 0" }}>
                  {user.city && <span>📍 {user.city}{user.country ? ", " : ""}{user.country}</span>}
                  {!user.city && user.location && <span>📍 {user.location}</span>}
                  {(user.city || user.location) && user.organization && " • "}
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
                      {t.profile.cancel}
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
                      {saving ? t.profile.saving : t.profile.saveProfile}
                    </button>
                  </div>
                ) : (
                  <div className="profile-page-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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
                      {t.profile.editProfile}
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
                      {t.common.logout}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="profile-page-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px", alignItems: "start" }}>
          {/* Main Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* About */}
            <div
              className="profile-page-section"
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "box-shadow 0.3s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
                {t.profile.about}
              </h2>
              {editing ? (
                <textarea
                  value={formData.about || ""}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  placeholder={t.profile.aboutPlaceholder}
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
                  {getTranslatedText(user.about, (user as any).aboutTranslations, locale) || t.profile.noAbout}
                </p>
              )}
            </div>

            {/* Experience */}
            <div
              className="profile-page-section"
              style={{
                ...getCardStyle(),
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "0",
                animation: "fadeIn 0.3s ease-out",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "box-shadow 0.3s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "600" }}>{t.profile.experience}</h2>
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
                    {t.profile.addExperience}
                  </button>
                )}
              </div>
              {user.experience && user.experience.length > 0 ? (
                <div>
                  {[...user.experience]
                    .sort((a: any, b: any) => {
                      // Sort chronologically: most recent first
                      // If current, put it first
                      if (a.current && !b.current) return -1;
                      if (!a.current && b.current) return 1;
                      
                      // Helper function to parse date (handles both YYYY-MM and YYYY-MM-DD formats)
                      const parseDate = (dateStr: string) => {
                        if (!dateStr) return new Date(0);
                        // If format is YYYY-MM, add -01 to make it a valid date
                        if (dateStr.match(/^\d{4}-\d{2}$/)) {
                          return new Date(dateStr + '-01');
                        }
                        return new Date(dateStr);
                      };
                      
                      // Compare end dates (or start dates if both current)
                      const dateA = a.current 
                        ? parseDate(a.startDate) 
                        : parseDate(a.endDate || a.startDate);
                      const dateB = b.current 
                        ? parseDate(b.startDate) 
                        : parseDate(b.endDate || b.startDate);
                      
                      // If dates are invalid, put them at the end
                      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
                      if (isNaN(dateA.getTime())) return 1;
                      if (isNaN(dateB.getTime())) return -1;
                      
                      return dateB.getTime() - dateA.getTime(); // Most recent first
                    })
                    .map((exp: any, idx: number) => (
                    <div 
                      key={idx}
                      className="profile-page-experience-item"
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
                            {getTranslatedField(exp, "title", "titleTranslations", locale)}
                          </h3>
                          <p style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                            {exp.company}
                          </p>
                          <p style={{ fontSize: "12px", color: "#999" }}>
                            {formatDate(exp.startDate)} - {exp.current ? t.profile.present : formatDate(exp.endDate)}
                          </p>
                          {exp.description && (
                            <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                              {getTranslatedField(exp, "description", "descriptionTranslations", locale)}
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
                              {t.profile.edit}
                            </button>
                            <button
                              onClick={async () => {
                                const newExp = (formData.experience || []).filter((_: any, i: number) => i !== idx);
                                const updatedFormData = { ...formData, experience: newExp };
                                setFormData(updatedFormData);
                                
                                // Save immediately
                                try {
                                  const dataToSend = {
                                    ...updatedFormData,
                                    locale: locale,
                                  };
                                  
                                  const res = await fetch("/api/profile", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(dataToSend),
                                  });

                                  if (res.ok) {
                                    const updated = await res.json();
                                    setUser(updated);
                                    setFormData(updated);
                                  }
                                } catch (error) {
                                  console.error("Error deleting experience:", error);
                                }
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
                              {t.profile.delete}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "14px", color: "#666" }}>{t.profile.noExperience}</p>
              )}
            </div>

            {/* Education */}
            <div
              className="profile-page-section"
              style={{
                ...getCardStyle(),
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "box-shadow 0.3s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "600" }}>{t.profile.education}</h2>
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
                    {t.profile.addEducation}
                  </button>
                )}
              </div>
              {user.education && user.education.length > 0 ? (
                <div>
                  {[...user.education]
                    .sort((a: any, b: any) => {
                      // Sort chronologically: most recent first
                      // If current, put it first
                      if (a.current && !b.current) return -1;
                      if (!a.current && b.current) return 1;
                      
                      // Compare end dates (or start dates if both current)
                      const dateA = a.current ? new Date(a.startDate) : new Date(a.endDate || a.startDate);
                      const dateB = b.current ? new Date(b.startDate) : new Date(b.endDate || b.startDate);
                      
                      return dateB.getTime() - dateA.getTime(); // Most recent first
                    })
                    .map((edu: any, idx: number) => (
                    <div 
                      key={idx}
                      className="profile-page-education-item"
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
                            {getTranslatedField(edu, "school", "schoolTranslations", locale)}
                          </h3>
                          {edu.degree && (
                            <p style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                              {getTranslatedField(edu, "degree", "degreeTranslations", locale)} {edu.field && `in ${edu.field}`}
                            </p>
                          )}
                          <p style={{ fontSize: "12px", color: "#999" }}>
                            {formatDate(edu.startDate)} - {edu.current ? t.profile.present : formatDate(edu.endDate)}
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
                              {t.profile.edit}
                            </button>
                            <button
                              onClick={async () => {
                                const newEdu = (formData.education || []).filter((_: any, i: number) => i !== idx);
                                const updatedFormData = { ...formData, education: newEdu };
                                setFormData(updatedFormData);
                                
                                // Save immediately
                                try {
                                  const dataToSend = {
                                    ...updatedFormData,
                                    locale: locale,
                                  };
                                  
                                  const res = await fetch("/api/profile", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(dataToSend),
                                  });

                                  if (res.ok) {
                                    const updated = await res.json();
                                    setUser(updated);
                                    setFormData(updated);
                                  }
                                } catch (error) {
                                  console.error("Error deleting education:", error);
                                }
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
                              {t.profile.delete}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "14px", color: "#666" }}>{t.profile.noEducation}</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", position: "sticky", top: "100px" }}>
            {/* Contact Info */}
            <div
              style={{
                ...getCardStyle(),
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "box-shadow 0.3s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
                {t.profile.contactInfo}
              </h2>
              {editing ? (
                <div style={{ fontSize: "14px" }}>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", color: "#666" }}>
                      {t.profile.email}
                    </label>
                    <input
                      type="email"
                      value={formData.email || ""}
                      disabled
                      style={{
                        width: "100%",
                        padding: "8px",
                        ...getInputStyle(),
                        borderRadius: "4px",
                        fontSize: "14px",
                        opacity: 0.7,
                      }}
                    />
                    <p style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>{t.profile.emailCannotChange}</p>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", color: "#666" }}>
                      {t.profile.phone}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder={t.profile.phonePlaceholder}
                      style={{
                        width: "100%",
                        padding: "8px",
                        ...getInputStyle(),
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", color: "#666" }}>
                      {t.profile.website}
                    </label>
                    <input
                      type="url"
                      value={formData.website || ""}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder={t.profile.websitePlaceholder}
                      style={{
                        width: "100%",
                        padding: "8px",
                        ...getInputStyle(),
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", color: "#666" }}>
                      {t.profile.linkedin}
                    </label>
                    <input
                      type="url"
                      value={formData.linkedin || ""}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      placeholder={t.profile.linkedinPlaceholder}
                      style={{
                        width: "100%",
                        padding: "8px",
                        ...getInputStyle(),
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", color: "#666" }}>
                      {t.profile.twitter}
                    </label>
                    <input
                      type="url"
                      value={formData.twitter || ""}
                      onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                      placeholder={t.profile.twitterPlaceholder}
                      style={{
                        width: "100%",
                        padding: "8px",
                        ...getInputStyle(),
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
                        {t.profile.linkedin}
                      </a>
                    </p>
                  )}
                  {user.twitter && (
                    <p style={{ marginBottom: "8px" }}>
                      🐦 <a href={user.twitter} target="_blank" rel="noopener noreferrer" style={{ color: "#0a66c2" }}>
                        {t.profile.twitter}
                      </a>
                    </p>
                  )}
                  {!user.phone && !user.website && !user.linkedin && !user.twitter && (
                    <p style={{ fontSize: "14px", color: "#666" }}>{t.profile.noContactInfo}</p>
                  )}
                </div>
              )}
            </div>

            {/* Skills */}
            <div
              style={{
                ...getCardStyle(),
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "0",
                overflow: "hidden",
                boxSizing: "border-box",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "box-shadow 0.3s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "600" }}>{t.profile.skills}</h2>
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
                          onClick={async () => {
                            const newSkills = (formData.skills || []).filter((_: string, i: number) => i !== idx);
                            const updatedFormData = { ...formData, skills: newSkills };
                            setFormData(updatedFormData);
                            
                            // Save immediately
                            try {
                              const dataToSend = {
                                ...updatedFormData,
                                locale: locale,
                              };
                              
                              const res = await fetch("/api/profile", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(dataToSend),
                              });

                              if (res.ok) {
                                const updated = await res.json();
                                setUser(updated);
                                setFormData(updated);
                              }
                            } catch (error) {
                              console.error("Error saving skills:", error);
                            }
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
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%" }}>
                    <input
                      type="text"
                      placeholder={t.profile.addSkillPlaceholder}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && e.currentTarget.value.trim()) {
                          const skillToAdd = e.currentTarget.value.trim();
                          const newSkills = [...(formData.skills || []), skillToAdd];
                          const updatedFormData = { ...formData, skills: newSkills };
                          setFormData(updatedFormData);
                          e.currentTarget.value = "";
                          
                          // Save immediately
                          try {
                            const dataToSend = {
                              ...updatedFormData,
                              locale: locale,
                            };
                            
                            const res = await fetch("/api/profile", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(dataToSend),
                            });

                            if (res.ok) {
                              const updated = await res.json();
                              setUser(updated);
                              setFormData(updated);
                            }
                          } catch (error) {
                            console.error("Error saving skills:", error);
                          }
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                        transition: "all 0.2s ease",
                        height: "40px",
                        boxSizing: "border-box",
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
                      onClick={async (e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input && input.value.trim()) {
                          const skillToAdd = input.value.trim();
                          const newSkills = [...(formData.skills || []), skillToAdd];
                          const updatedFormData = { ...formData, skills: newSkills };
                          setFormData(updatedFormData);
                          input.value = "";
                          
                          // Save immediately
                          try {
                            const dataToSend = {
                              ...updatedFormData,
                              locale: locale,
                            };
                            
                            const res = await fetch("/api/profile", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(dataToSend),
                            });

                            if (res.ok) {
                              const updated = await res.json();
                              setUser(updated);
                              setFormData(updated);
                            }
                          } catch (error) {
                            console.error("Error saving skills:", error);
                          }
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
                        height: "40px",
                        boxSizing: "border-box",
                        whiteSpace: "nowrap",
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
                      {t.profile.addSkill}
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
                    <p style={{ fontSize: "14px", color: "#666" }}>{t.profile.noSkills}</p>
                  )}
                </>
              )}
            </div>

            {/* Search */}
            <div
              style={{
                ...getCardStyle(),
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "box-shadow 0.3s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 16px 0" }}>
                {t.profile.search || "Search"}
              </h2>
              <Link
                href={localeLink("/search", locale)}
                style={{
                  display: "inline-block",
                  fontSize: "14px",
                  color: "#0a66c2",
                  textDecoration: "none",
                  fontWeight: "500",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  border: "1px solid #0a66c2",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#0a66c2";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#0a66c2";
                }}
              >
                {t.profile.searchUsers || "Search users"}
              </Link>
            </div>

            {/* Connection Requests */}
            <div
              style={{
                ...getCardStyle(),
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "box-shadow 0.3s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 16px 0" }}>
                {t.profile.connectionRequests} {pendingRequests.length > 0 && `(${pendingRequests.length})`}
              </h2>
              {loadingConnections ? (
                <p style={{ fontSize: "14px", color: "#666" }}>{t.profile.loading}</p>
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
                          href={localeLink(`/user-profile?id=${conn.user?._id}`, locale)}
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
                          {processingConnection === conn._id ? "..." : t.profile.accept}
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
                          {t.profile.decline}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "14px", color: "#666" }}>{t.profile.noPendingRequests}</p>
              )}
            </div>

            {/* My Connections */}
            {acceptedConnections.length > 0 && (
              <div
                style={{
                  ...getCardStyle(),
                  borderRadius: "12px",
                  padding: "24px",
                  marginBottom: "0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  transition: "box-shadow 0.3s ease, transform 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: "600" }}>
                    {t.profile.myConnections} ({acceptedConnections.length})
                  </h2>
                  <button
                    onClick={() => setShowConnectionsModal(true)}
                    style={{
                      padding: "6px 16px",
                      border: "1px solid #0a66c2",
                      background: "white",
                      color: "#0a66c2",
                      borderRadius: "16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
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
                    {t.profile.viewAll}
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {(Array.isArray(acceptedConnections) ? acceptedConnections.slice(0, 5) : []).map((conn) => (
                    <div
                      key={conn._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "12px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        transition: "all 0.2s ease",
                        background: "white",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#0a66c2";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(10, 102, 194, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e0e0e0";
                        e.currentTarget.style.boxShadow = "none";
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
                          fontSize: "18px",
                          color: "#666",
                          flexShrink: 0,
                          border: "2px solid #f0f0f0",
                        }}
                      >
                        {!conn.user?.profilePicture &&
                          (conn.user?.displayName || conn.user?.username)?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link
                          href={localeLink(`/user-profile?id=${conn.user?._id}`, locale)}
                          style={{
                            fontSize: "15px",
                            fontWeight: "600",
                            color: "#333",
                            textDecoration: "none",
                            display: "block",
                            marginBottom: "4px",
                            transition: "color 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#0a66c2";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#333";
                          }}
                        >
                          {conn.user?.displayName || conn.user?.username}
                        </Link>
                        {conn.user?.headline && (
                          <p style={{ fontSize: "13px", color: "#666", margin: 0, lineHeight: "1.4" }}>
                            {conn.user.headline}
                          </p>
                        )}
                      </div>
                      <Link
                        href={localeLink(`/chat?userId=${conn.user?._id}`, locale)}
                        style={{
                          padding: "8px 16px",
                          border: "1px solid #0a66c2",
                          background: "white",
                          color: "#0a66c2",
                          borderRadius: "20px",
                          fontSize: "13px",
                          fontWeight: "600",
                          textDecoration: "none",
                          transition: "all 0.2s ease",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
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
                        {t.profile.message}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings */}
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "box-shadow 0.3s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
                {t.profile.settings}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Password Reset */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>{t.profile.password}</h3>
                    <p style={{ fontSize: "14px", color: "#666" }}>{t.profile.passwordDesc}</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    style={{
                      padding: "6px 16px",
                      border: "1px solid #0a66c2",
                      background: "white",
                      color: "#0a66c2",
                      borderRadius: "16px",
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
                  >
                    {t.profile.change}
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Visitors */}
            <div
              style={{
                ...getCardStyle(),
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "box-shadow 0.3s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
                {t.profile.profileVisitors} ({profileVisitors.length})
              </h2>
              {loadingVisitors ? (
                <p style={{ fontSize: "14px", color: "#666" }}>{t.profile.loading}</p>
              ) : profileVisitors.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {profileVisitors.map((visit) => (
                    <div
                      key={visit._id}
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
                          background: visit.visitor.profilePicture
                            ? `url(${visit.visitor.profilePicture}) center/cover`
                            : "#e4e4e4",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                          color: "#666",
                          flexShrink: 0,
                        }}
                      >
                        {!visit.visitor.profilePicture &&
                          (visit.visitor.displayName || visit.visitor.username)?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <Link
                          href={localeLink(`/user-profile?id=${visit.visitor._id}`, locale)}
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#0a66c2",
                            textDecoration: "none",
                          }}
                        >
                          {visit.visitor.displayName || visit.visitor.username}
                        </Link>
                        <p style={{ fontSize: "12px", color: "#999", margin: "2px 0 0" }}>
                          {new Date(visit.visitedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "14px", color: "#666" }}>
                  {t.profile.noVisitors}
                </p>
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
              width: "100%",
              maxWidth: "1200px",
              display: "flex",
              justifyContent: "center",
              margin: "0 auto",
            }}
          >
            <ExperienceModal
              experience={editingExp}
              t={t}
              onClose={() => {
                setShowExpModal(false);
                setEditingExp(null);
              }}
              onSave={async (exp) => {
                let newExp = [...(formData.experience || [])];
                if (editingExp) {
                  const idx = (formData.experience || []).findIndex((e: any) => e === editingExp);
                  if (idx >= 0) {
                    newExp[idx] = exp;
                  }
                } else {
                  newExp.push(exp);
                }
                const updatedFormData = { ...formData, experience: newExp };
                // Update user state immediately for instant UI update
                setUser({ ...user, experience: newExp });
                setFormData(updatedFormData);
                
                // Save to server in background
                try {
                  const dataToSend = {
                    ...updatedFormData,
                    locale: locale,
                  };
                  
                  const res = await fetch("/api/profile", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dataToSend),
                  });

                  if (res.ok) {
                    const updated = await res.json();
                    setUser(updated);
                    setFormData(updated);
                  }
                } catch (error) {
                  console.error("Error saving experience:", error);
                  // Revert on error
                  setUser(user);
                  setFormData(formData);
                }
                
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
              width: "100%",
              maxWidth: "1200px",
              display: "flex",
              justifyContent: "center",
              margin: "0 auto",
            }}
          >
            <EducationModal
              education={editingEdu}
              t={t}
              onClose={() => {
                setShowEduModal(false);
                setEditingEdu(null);
              }}
              onSave={async (edu) => {
                let newEdu = [...(formData.education || [])];
                if (editingEdu) {
                  const idx = (formData.education || []).findIndex((e: any) => e === editingEdu);
                  if (idx >= 0) {
                    newEdu[idx] = edu;
                  }
                } else {
                  newEdu.push(edu);
                }
                const updatedFormData = { ...formData, education: newEdu };
                // Update user state immediately for instant UI update
                setUser({ ...user, education: newEdu });
                setFormData(updatedFormData);
                
                // Save to server in background
                try {
                  const dataToSend = {
                    ...updatedFormData,
                    locale: locale,
                  };
                  
                  const res = await fetch("/api/profile", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dataToSend),
                  });

                  if (res.ok) {
                    const updated = await res.json();
                    setUser(updated);
                    setFormData(updated);
                  }
                } catch (error) {
                  console.error("Error saving education:", error);
                  // Revert on error
                  setUser(user);
                  setFormData(formData);
                }
                
                setShowEduModal(false);
                setEditingEdu(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
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
            setShowPasswordModal(false);
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "24px",
              width: "90%",
              maxWidth: "1200px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              animation: "scaleIn 0.2s ease-out",
            }}
          >
            <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "24px" }}>
              Reset Password
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
                  {t.profile.currentPassword} *
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder={t.profile.enterCurrentPassword}
                  style={{
                    width: "100%",
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
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
                  {t.profile.newPassword} *
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder={t.profile.enterNewPassword}
                  style={{
                    width: "100%",
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
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
                  {t.profile.confirmPassword} *
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder={t.profile.confirmNewPassword}
                  style={{
                    width: "100%",
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
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                  style={{
                    padding: "8px 24px",
                    border: "1px solid #666",
                    background: "white",
                    borderRadius: "24px",
                    cursor: "pointer",
                    fontSize: "14px",
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
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  style={{
                    padding: "8px 24px",
                    border: "none",
                    background: "#0a66c2",
                    color: "white",
                    borderRadius: "24px",
                    cursor: changingPassword ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    opacity: changingPassword ? 0.6 : 1,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!changingPassword) {
                      e.currentTarget.style.background = "#004182";
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(10, 102, 194, 0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!changingPassword) {
                      e.currentTarget.style.background = "#0a66c2";
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  {changingPassword ? t.profile.changing : t.profile.changePassword}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connections Modal */}
      {showConnectionsModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConnectionsModal(false);
              setShowSortDropdown(false);
            }
          }}
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
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...getCardStyle(),
              borderRadius: "8px",
              padding: "24px",
              width: "90%",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600" }}>
                {t.profile.myConnections} ({acceptedConnections.length})
              </h2>
              <button
                onClick={() => setShowConnectionsModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "24px",
                  color: "#666",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f0f0f0";
                  e.currentTarget.style.color = "#333";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#666";
                }}
              >
                ×
              </button>
            </div>

            {/* Search and Sort Controls */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
              {/* Search Input */}
              <div style={{ flex: 1, minWidth: "200px" }}>
                <input
                  type="text"
                  placeholder={t.profile.searchByName}
                  value={connectionsSearchTerm}
                  onChange={(e) => setConnectionsSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    ...getInputStyle(),
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Sort Dropdown */}
              <div style={{ position: "relative" }} data-sort-dropdown>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px", color: "#666", whiteSpace: "nowrap" }}>
                    {t.profile.sortBy}
                  </span>
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setShowSortDropdown(!showSortDropdown)}
                      style={{
                        padding: "10px 16px",
                        ...getInputStyle(),
                        borderRadius: "6px",
                        fontSize: "14px",
                        cursor: "pointer",
                        minWidth: "150px",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>
                        {connectionsSortBy === "recently" && t.profile.recentlyAdded}
                        {connectionsSortBy === "firstName" && t.profile.firstName}
                        {connectionsSortBy === "lastName" && t.profile.lastName}
                      </span>
                      <span style={{ fontSize: "12px" }}>▼</span>
                    </button>
                    {showSortDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          marginTop: "4px",
                          ...getCardStyle(),
                          borderRadius: "6px",
                          padding: "4px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          zIndex: 10001,
                        }}
                      >
                        {[
                          { value: "recently", label: t.profile.recentlyAdded },
                          { value: "firstName", label: t.profile.firstName },
                          { value: "lastName", label: t.profile.lastName },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setConnectionsSortBy(option.value as "recently" | "firstName" | "lastName");
                              setShowSortDropdown(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              background: "transparent",
                              border: "none",
                              textAlign: "left",
                              fontSize: "14px",
                              color: "#333",
                              cursor: "pointer",
                              borderRadius: "4px",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f0f0f0";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {(() => {
                // Filter and sort connections
                let filteredAndSorted = [...acceptedConnections];

                // Filter by search term
                if (connectionsSearchTerm.trim()) {
                  const searchLower = connectionsSearchTerm.toLowerCase();
                  filteredAndSorted = filteredAndSorted.filter((conn) => {
                    const displayName = (conn.user?.displayName || "").toLowerCase();
                    const username = (conn.user?.username || "").toLowerCase();
                    return displayName.includes(searchLower) || username.includes(searchLower);
                  });
                }

                // Sort connections
                filteredAndSorted.sort((a, b) => {
                  if (connectionsSortBy === "recently") {
                    // Sort by connection creation date (most recent first)
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                  } else if (connectionsSortBy === "firstName") {
                    const nameA = (a.user?.displayName || a.user?.username || "").split(" ")[0].toLowerCase();
                    const nameB = (b.user?.displayName || b.user?.username || "").split(" ")[0].toLowerCase();
                    return nameA.localeCompare(nameB);
                  } else if (connectionsSortBy === "lastName") {
                    const nameA = (a.user?.displayName || a.user?.username || "").split(" ").slice(-1)[0].toLowerCase();
                    const nameB = (b.user?.displayName || b.user?.username || "").split(" ").slice(-1)[0].toLowerCase();
                    return nameA.localeCompare(nameB);
                  }
                  return 0;
                });

                return filteredAndSorted.length > 0 ? (
                  filteredAndSorted.map((conn) => (
                  <div
                    key={conn._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f5f5f5";
                      e.currentTarget.style.borderColor = "#0a66c2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "#e0e0e0";
                    }}
                  >
                    <Link
                      href={localeLink(`/user-profile?id=${conn.user?._id}`, locale)}
                      style={{
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          background: conn.user?.profilePicture
                            ? `url(${conn.user.profilePicture}) center/cover`
                            : "#e4e4e4",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "18px",
                          color: "#666",
                          flexShrink: 0,
                          cursor: "pointer",
                          transition: "transform 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        {!conn.user?.profilePicture &&
                          (conn.user?.displayName || conn.user?.username)?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#333",
                            marginBottom: "4px",
                          }}
                        >
                          {conn.user?.displayName || conn.user?.username}
                        </div>
                        {conn.user?.headline && (
                          <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
                            {conn.user.headline}
                          </p>
                        )}
                      </div>
                    </Link>
                    <Link
                      href={localeLink(`/user-profile?id=${conn.user?._id}`, locale)}
                      style={{
                        padding: "8px 16px",
                        border: "1px solid #0a66c2",
                        background: "white",
                        color: "#0a66c2",
                        borderRadius: "20px",
                        fontSize: "14px",
                        fontWeight: "600",
                        textDecoration: "none",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap",
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
                      {t.profile.viewProfile}
                    </Link>
                    <Link
                      href={localeLink(`/chat?userId=${conn.user?._id}`, locale)}
                      style={{
                        padding: "8px 16px",
                        border: "1px solid #0a66c2",
                        background: "#0a66c2",
                        color: "white",
                        borderRadius: "20px",
                        fontSize: "14px",
                        fontWeight: "600",
                        textDecoration: "none",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap",
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
                      {t.profile.message}
                    </Link>
                    {/* 3 Dots Menu */}
                    <div style={{ position: "relative" }} data-connection-menu>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowConnectionMenu(showConnectionMenu === conn._id ? null : conn._id);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          fontSize: "20px",
                          color: "#666",
                          cursor: "pointer",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f0f0f0";
                          e.currentTarget.style.color = "#333";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#666";
                        }}
                      >
                        ⋯
                      </button>
                      {showConnectionMenu === conn._id && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            marginTop: "4px",
                            ...getCardStyle(),
                            borderRadius: "6px",
                            padding: "4px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            zIndex: 10002,
                            minWidth: "180px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(t.profile.areYouSureRemove)) {
                                setRemovingConnection(conn._id);
                                try {
                                  const res = await fetch("/api/connections/remove", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ connectionId: conn._id }),
                                  });
                                  if (res.ok) {
                                    await loadConnections();
                                    setShowConnectionMenu(null);
                                  } else {
                                    const error = await res.json();
                                    alert(error.error || (locale === "en" ? "Failed to remove connection" : locale === "me" ? "Neuspješno uklanjanje veze" : locale === "sq" ? "Dështoi heqja e lidhjes" : "Impossibile rimuovere la connessione"));
                                  }
                                } catch (error) {
                                  console.error("Error removing connection:", error);
                                  alert(locale === "en" ? "Error removing connection" : locale === "me" ? "Greška pri uklanjanju veze" : locale === "sq" ? "Gabim gjatë heqjes së lidhjes" : "Errore durante la rimozione della connessione");
                                } finally {
                                  setRemovingConnection(null);
                                }
                              }
                            }}
                            disabled={removingConnection === conn._id}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              background: "transparent",
                              border: "none",
                              textAlign: "left",
                              fontSize: "14px",
                              color: "#e63946",
                              cursor: removingConnection === conn._id ? "not-allowed" : "pointer",
                              borderRadius: "4px",
                              transition: "all 0.2s ease",
                              opacity: removingConnection === conn._id ? 0.6 : 1,
                            }}
                            onMouseEnter={(e) => {
                              if (removingConnection !== conn._id) {
                                e.currentTarget.style.background = "#f0f0f0";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {removingConnection === conn._id ? t.profile.removing : t.profile.removeConnection}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  ))
                ) : (
                  <p style={{ fontSize: "14px", color: "#666", textAlign: "center", padding: "20px" }}>
                    {connectionsSearchTerm.trim() ? t.profile.noConnectionsFound : t.profile.noConnections}
                  </p>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  );
}

// Experience Modal Component
function ExperienceModal({
  experience,
  t,
  onClose,
  onSave,
}: {
  experience: any;
  t: any;
  onClose: () => void;
  onSave: (exp: any) => void;
}) {
  // Helper function to convert month format (YYYY-MM) to date format (YYYY-MM-DD)
  // Helper function to convert YYYY-MM to dd/mm/yyyy format
  const monthToDate = (monthStr: string) => {
    if (!monthStr) return "";
    if (monthStr.includes("-") && monthStr.split("-").length === 2) {
      const [year, month] = monthStr.split("-");
      return `01/${month}/${year}`; // Convert to dd/mm/yyyy format
    }
    // If already in dd/mm/yyyy format, return as is
    if (monthStr.includes("/") && monthStr.split("/").length === 3) {
      return monthStr;
    }
    // If in YYYY-MM-DD format, convert to dd/mm/yyyy
    if (monthStr.includes("-") && monthStr.split("-").length === 3) {
      const [year, month, day] = monthStr.split("-");
      return `${day}/${month}/${year}`;
    }
    return monthStr;
  };

  // Helper function to convert dd/mm/yyyy to YYYY-MM format for storage
  const dateToMonth = (dateStr: string) => {
    if (!dateStr) return "";
    // If in dd/mm/yyyy format, convert to YYYY-MM
    if (dateStr.includes("/") && dateStr.split("/").length === 3) {
      const [day, month, year] = dateStr.split("/");
      return `${year}-${month}`; // Extract YYYY-MM from dd/mm/yyyy
    }
    // If in YYYY-MM-DD format, extract YYYY-MM
    if (dateStr.includes("-") && dateStr.split("-").length === 3) {
      return dateStr.substring(0, 7); // Extract YYYY-MM from YYYY-MM-DD
    }
    return dateStr;
  };

  // Helper function to format date input as user types (dd/mm/yyyy)
  const formatDateInput = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "");
    
    // Format as dd/mm/yyyy
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
  };

  // Helper function to validate dd/mm/yyyy date
  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr || !dateStr.includes("/")) return false;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return false;
    const [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return false;
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
  };

  const [formData, setFormData] = useState({
    title: experience?.title || "",
    company: experience?.company || "",
    location: experience?.location || "",
    startDate: monthToDate(experience?.startDate || ""),
    endDate: monthToDate(experience?.endDate || ""),
    current: experience?.current || false,
    description: experience?.description || "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Convert dates back to month format for storage
    const dataToSave = {
      ...formData,
      startDate: dateToMonth(formData.startDate),
      endDate: dateToMonth(formData.endDate),
    };
    onSave(dataToSave);
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: "8px",
        padding: "24px",
        width: "100%",
        maxWidth: "1200px",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "24px" }}>
        {experience ? t.profile.editExperienceTitle : t.profile.addExperienceTitle}
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
            {t.profile.title} *
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
            {t.profile.company} *
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
            {t.profile.location}
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
        <div style={{ marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
              {t.profile.startDate} *
            </label>
            <input
              type="text"
              value={formData.startDate}
              onChange={(e) => {
                const formatted = formatDateInput(e.target.value);
                setFormData({ ...formData, startDate: formatted });
              }}
              onBlur={(e) => {
                if (e.target.value && !isValidDate(e.target.value)) {
                  // If invalid, try to fix or clear
                  const parts = e.target.value.split("/");
                  if (parts.length === 3) {
                    const [day, month, year] = parts.map(Number);
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                      const date = new Date(year, month - 1, day);
                      if (!isNaN(date.getTime())) {
                        const fixed = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                        setFormData({ ...formData, startDate: fixed });
                      }
                    }
                  }
                }
              }}
              placeholder="dd/mm/yyyy"
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
                minHeight: "44px",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
              {t.profile.endDate}
            </label>
            <input
              type="text"
              value={formData.endDate}
              onChange={(e) => {
                const formatted = formatDateInput(e.target.value);
                setFormData({ ...formData, endDate: formatted });
              }}
              onBlur={(e) => {
                if (e.target.value && !isValidDate(e.target.value)) {
                  // If invalid, try to fix or clear
                  const parts = e.target.value.split("/");
                  if (parts.length === 3) {
                    const [day, month, year] = parts.map(Number);
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                      const date = new Date(year, month - 1, day);
                      if (!isNaN(date.getTime())) {
                        const fixed = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                        setFormData({ ...formData, endDate: fixed });
                      }
                    }
                  }
                }
              }}
              placeholder="dd/mm/yyyy"
              disabled={formData.current}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
                minHeight: "44px",
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
            {t.profile.current}
          </label>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
            {t.profile.description}
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
            {t.profile.cancel}
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
            {t.cms.save}
          </button>
        </div>
      </form>
    </div>
  );
}

// Education Modal Component
function EducationModal({
  education,
  t,
  onClose,
  onSave,
}: {
  education: any;
  t: any;
  onClose: () => void;
  onSave: (edu: any) => void;
}) {
  // Helper function to convert YYYY-MM to dd/mm/yyyy format
  const monthToDate = (monthStr: string) => {
    if (!monthStr) return "";
    if (monthStr.includes("-") && monthStr.split("-").length === 2) {
      const [year, month] = monthStr.split("-");
      return `01/${month}/${year}`; // Convert to dd/mm/yyyy format
    }
    // If already in dd/mm/yyyy format, return as is
    if (monthStr.includes("/") && monthStr.split("/").length === 3) {
      return monthStr;
    }
    // If in YYYY-MM-DD format, convert to dd/mm/yyyy
    if (monthStr.includes("-") && monthStr.split("-").length === 3) {
      const [year, month, day] = monthStr.split("-");
      return `${day}/${month}/${year}`;
    }
    return monthStr;
  };

  // Helper function to convert dd/mm/yyyy to YYYY-MM format for storage
  const dateToMonth = (dateStr: string) => {
    if (!dateStr) return "";
    // If in dd/mm/yyyy format, convert to YYYY-MM
    if (dateStr.includes("/") && dateStr.split("/").length === 3) {
      const [day, month, year] = dateStr.split("/");
      return `${year}-${month}`; // Extract YYYY-MM from dd/mm/yyyy
    }
    // If in YYYY-MM-DD format, extract YYYY-MM
    if (dateStr.includes("-") && dateStr.split("-").length === 3) {
      return dateStr.substring(0, 7); // Extract YYYY-MM from YYYY-MM-DD
    }
    return dateStr;
  };

  // Helper function to format date input as user types (dd/mm/yyyy)
  const formatDateInput = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "");
    
    // Format as dd/mm/yyyy
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
  };

  // Helper function to validate dd/mm/yyyy date
  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr || !dateStr.includes("/")) return false;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return false;
    const [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return false;
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
  };

  const [formData, setFormData] = useState({
    school: education?.school || "",
    degree: education?.degree || "",
    field: education?.field || "",
    startDate: monthToDate(education?.startDate || ""),
    endDate: monthToDate(education?.endDate || ""),
    current: education?.current || false,
    description: education?.description || "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Convert dates back to month format for storage
    const dataToSave = {
      ...formData,
      startDate: dateToMonth(formData.startDate),
      endDate: dateToMonth(formData.endDate),
    };
    onSave(dataToSave);
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: "8px",
        padding: "24px",
        width: "100%",
        maxWidth: "1200px",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "24px" }}>
          {education ? t.profile.editEducationTitle : t.profile.addEducationTitle}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
              {t.profile.school} *
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
              {t.profile.degree}
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
              {t.profile.fieldOfStudy}
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
        <div style={{ marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
                {t.profile.startDate} *
              </label>
              <input
                type="text"
                value={formData.startDate}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setFormData({ ...formData, startDate: formatted });
                }}
                onBlur={(e) => {
                  if (e.target.value && !isValidDate(e.target.value)) {
                    // If invalid, try to fix or clear
                    const parts = e.target.value.split("/");
                    if (parts.length === 3) {
                      const [day, month, year] = parts.map(Number);
                      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        const date = new Date(year, month - 1, day);
                        if (!isNaN(date.getTime())) {
                          const fixed = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                          setFormData({ ...formData, startDate: fixed });
                        }
                      }
                    }
                  }
                }}
                placeholder="dd/mm/yyyy"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                  minHeight: "44px",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "600" }}>
                {t.profile.endDate}
              </label>
              <input
                type="text"
                value={formData.endDate}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setFormData({ ...formData, endDate: formatted });
                }}
                onBlur={(e) => {
                  if (e.target.value && !isValidDate(e.target.value)) {
                    // If invalid, try to fix or clear
                    const parts = e.target.value.split("/");
                    if (parts.length === 3) {
                      const [day, month, year] = parts.map(Number);
                      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        const date = new Date(year, month - 1, day);
                        if (!isNaN(date.getTime())) {
                          const fixed = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                          setFormData({ ...formData, endDate: fixed });
                        }
                      }
                    }
                  }
                }}
                placeholder="dd/mm/yyyy"
                disabled={formData.current}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                  minHeight: "44px",
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
              {t.profile.currentStudy}
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
              {t.profile.cancel}
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
              {t.cms.save}
            </button>
          </div>
      </form>
    </div>
  );
}
