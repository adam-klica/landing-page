"use client";

import { useState, useEffect } from "react";
import { CMSLayout } from "@/components/CMSLayout";
import { AdminGuard } from "@/components/AdminGuard";
import { localeNames, localeFlags, type Locale, defaultLocale } from "@/lib/i18n";
import { getTranslations } from "@/lib/getTranslations";
import { getStoredCmsLocale } from "@/lib/cmsLocale";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [cmsLocale, setCmsLocale] = useState<Locale>(defaultLocale);
  const [siteTitle, setSiteTitle] = useState("Adriatic Blue Growth Cluster");
  const [siteDescription, setSiteDescription] = useState("Adriatic Blue Growth Cluster (ABGC)");
  const [adminEmail, setAdminEmail] = useState("admin@abgc.local");

  // Load settings and CMS locale from localStorage
  useEffect(() => {
    setCmsLocale(getStoredCmsLocale());
    
    // Load settings from API
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSiteTitle(data.settings.siteTitle || "Adriatic Blue Growth Cluster");
            setSiteDescription(data.settings.siteDescription || "Adriatic Blue Growth Cluster (ABGC)");
            setAdminEmail(data.settings.adminEmail || "admin@abgc.local");
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }
    loadSettings();
  }, []);

  // Listen for locale changes
  useEffect(() => {
    const handleLocaleChange = () => {
      const savedLocale = getStoredCmsLocale();
      setCmsLocale((prevLocale) => (prevLocale !== savedLocale ? savedLocale : prevLocale));
    };

    // Sync once on mount (covers refreshed tabs and restored sessions).
    handleLocaleChange();

    window.addEventListener("storage", handleLocaleChange);
    window.addEventListener("cms-locale-changed", handleLocaleChange);

    return () => {
      window.removeEventListener("storage", handleLocaleChange);
      window.removeEventListener("cms-locale-changed", handleLocaleChange);
    };
  }, []);

  const t = getTranslations(cmsLocale);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteTitle,
          siteDescription,
          adminEmail,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(t.cms.settingsSaved);
      } else {
        setMessage(data.error || t.cms.saveFailed);
      }
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setMessage(`${t.cms.saveFailed}: ${error.message || t.cms.unknownError}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <CMSLayout>
      <div key={cmsLocale} className="cms-form-container" style={{ background: "white", padding: "20px", borderRadius: "4px" }}>
        <h1 style={{ margin: "0 0 20px 0", fontSize: "23px", fontWeight: "400" }}>
          {t.cms.settings}
        </h1>

        {message && (
          <div
            style={{
              padding: "10px",
              background: "#00a32a",
              color: "white",
              borderRadius: "3px",
              marginBottom: "20px",
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "400", marginBottom: "10px" }}>
              {t.cms.generalSettings}
            </h2>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}>
                {t.cms.siteTitle}
              </label>
              <input
                type="text"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  padding: "6px 10px",
                  border: "1px solid #8c8f94",
                  borderRadius: "3px",
                }}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}>
                {t.cms.siteDescription}
              </label>
              <textarea
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  padding: "6px 10px",
                  border: "1px solid #8c8f94",
                  borderRadius: "3px",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "400", marginBottom: "10px" }}>
              {t.cms.emailSettings}
            </h2>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}>
                {t.cms.adminEmail}
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  padding: "6px 10px",
                  border: "1px solid #8c8f94",
                  borderRadius: "3px",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              background: "#2271b1",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "3px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "13px",
            }}
          >
            {saving ? t.cms.saving : t.cms.saveChanges}
          </button>
        </form>
      </div>
      </CMSLayout>
    </AdminGuard>
  );
}
