"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { CMSLayout } from "@/components/CMSLayout";
import { AdminGuard } from "@/components/AdminGuard";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ImageUpload } from "@/components/ImageUpload";
import { Post } from "@/models/Post";
import { locales, localeNames, type Locale, defaultLocale } from "@/lib/i18n";
import { getTranslations } from "@/lib/getTranslations";
import { getStoredCmsLocale } from "@/lib/cmsLocale";

const CMS_DEBUG = process.env.NEXT_PUBLIC_CMS_DEBUG === "1";

function toDateTimeLocalValue(value?: string | Date): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getDatePart(value?: string): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function getTimePart(value?: string): string {
  if (!value) return "00:00";
  const time = value.slice(11, 16);
  return time || "00:00";
}

function NewPostPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") || "news") as "news" | "event";
  const [selectedLocale, setSelectedLocale] = useState<Locale | "">("");
  const [cmsLocale, setCmsLocale] = useState<Locale>(defaultLocale);
  const t = getTranslations(cmsLocale);

  // Load CMS locale from localStorage
  useEffect(() => {
    const locale = getStoredCmsLocale();
    setSelectedLocale(locale);
    setCmsLocale(locale);
  }, []);

  useEffect(() => {
    const handleLocaleChange = () => {
      const locale = getStoredCmsLocale();
      setCmsLocale(locale);
      setSelectedLocale((prev) => (prev ? prev : locale));
    };

    window.addEventListener("storage", handleLocaleChange);
    window.addEventListener("cms-locale-changed", handleLocaleChange);

    return () => {
      window.removeEventListener("storage", handleLocaleChange);
      window.removeEventListener("cms-locale-changed", handleLocaleChange);
    };
  }, []);

  const [formData, setFormData] = useState<Partial<Post>>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featuredImage: "",
    status: "draft",
    type: type,
    eventDate: "" as any,
    eventLocation: "",
  });

  const [saving, setSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [translateOnSave, setTranslateOnSave] = useState(false);
  const [translateTargets, setTranslateTargets] = useState<Record<Locale, boolean>>({
    me: false,
    en: false,
    it: false,
    sq: false,
  });

  useEffect(() => {
    if (!selectedLocale) return;
    setTranslateTargets({
      me: selectedLocale !== "me",
      en: selectedLocale !== "en",
      it: selectedLocale !== "it",
      sq: selectedLocale !== "sq",
    });
    setTranslateOnSave(false);
  }, [selectedLocale]);

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function handleTitleChange(title: string) {
    setFormData({
      ...formData,
      title,
      // Auto-generate slug only if it hasn't been manually edited
      slug: slugManuallyEdited ? formData.slug : generateSlug(title),
    });
  }

  function handleTitleBlur() {
    // When user finishes typing title, ensure slug is generated
    if (!slugManuallyEdited && formData.title) {
      setFormData({
        ...formData,
        slug: generateSlug(formData.title),
      });
    }
  }

  function handleSlugChange(slug: string) {
    setSlugManuallyEdited(true);
    setFormData({
      ...formData,
      slug,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.slug) {
        alert(`${t.cms.fillRequiredFields} (${t.cms.title}, ${t.cms.slug})`);
        setSaving(false);
        return;
      }
      
      // Content can be empty HTML from editor, so just ensure it's not undefined
      if (formData.content === undefined || formData.content === null) {
        formData.content = "";
      }

      // Prepare data for API
      const postData: any = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        excerpt: formData.excerpt || "",
        featuredImage: formData.featuredImage || "",
        type: type,
        status: formData.status || "draft",
        locale: selectedLocale, // Add locale to post data
        eventLocation: formData.eventLocation || "",
      };

      if (translateOnSave && selectedLocale) {
        const targets = Array.from(locales)
          .filter((l) => l !== selectedLocale)
          .filter((l) => !!translateTargets[l]);
        if (targets.length > 0) {
          postData.translateToLocales = targets;
        }
      }

      // Convert dates to ISO strings if they exist
      const eventDateValue = formData.eventDate as any;
      if (typeof eventDateValue === "string") {
        if (eventDateValue.trim()) {
          postData.eventDate = new Date(eventDateValue).toISOString();
        } else {
          postData.eventDate = null;
        }
      }

      if (CMS_DEBUG) {
        console.log("[CLIENT] Sending post data:", {
          title: postData.title,
          contentLength: postData.content?.length || 0,
          contentPreview: postData.content?.substring(0, 100) || "empty",
          locale: postData.locale,
        });
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (CMS_DEBUG) console.log("[CLIENT] Response status:", res.status);

      let data;
      try {
        const responseText = await res.text();
        if (CMS_DEBUG) {
          console.log("[CLIENT] Response text length:", responseText.length);
          console.log("[CLIENT] Response text preview:", responseText.substring(0, 500));
        }
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        alert(`${t.cms.errorLabel}: ${t.cms.invalidServerResponse}`);
        setSaving(false);
        return;
      }

      if (res.ok) {
        // Log translation debug info
        if (CMS_DEBUG && data.translationDebug) {
          console.log("[CLIENT] Translation Debug Info:", data.translationDebug);
          console.log("[CLIENT] Content Translation Lengths:", data.translationDebug.contentTranslationLengths);
          console.log("[CLIENT] Content Translation Previews:", data.translationDebug.contentTranslationPreviews);
        }
        
        // Wait a bit for the database to update before redirecting
        await new Promise((resolve) => setTimeout(resolve, 500));
        router.push(`/admin/posts?type=${type}`);
        // Force reload to ensure the list is refreshed
        window.location.href = `/admin/posts?type=${type}`;
      } else {
        console.error("Save error response:", { status: res.status, data });
        const errorMessage = data?.error || data?.message || `Server error (${res.status})`;
        alert(`${t.cms.saveFailed}: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error("Error saving post:", error);
      alert(`${t.cms.saveFailed}: ${error.message || t.cms.unknownError}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <CMSLayout>
      <div style={{ background: "white", padding: "20px", borderRadius: "4px" }}>
        <h1 style={{ margin: "0 0 20px 0", fontSize: "23px", fontWeight: "400" }}>
          {t.cms.addNew} {type === "news" ? t.cms.news : t.cms.events}
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px", fontWeight: "600" }}>
              {t.cms.selectLanguage || t.cms.language} <span style={{ color: "red" }}>*</span>
            </label>
            <select
              value={selectedLocale || ""}
              onChange={(e) => {
                const newLocale = e.target.value as Locale;
                if (newLocale) {
                  setSelectedLocale(newLocale);
                }
              }}
              required
              style={{
                width: "100%",
                maxWidth: "300px",
                padding: "6px 10px",
                border: "1px solid #8c8f94",
                borderRadius: "3px",
                fontSize: "14px",
                cursor: "pointer",
                background: "white",
              }}
            >
              <option value="" disabled>{t.cms.pleaseSelectLanguage}</option>
              {locales.map((locale) => (
                <option key={locale} value={locale}>
                  {localeNames[locale]} ({locale.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "600" }}>
              <input
                type="checkbox"
                checked={translateOnSave}
                onChange={(e) => setTranslateOnSave(e.target.checked)}
                disabled={!selectedLocale}
              />
              {t.cms.translateOnSave}
            </label>
            {translateOnSave && selectedLocale && (
              <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {Array.from(locales).filter((l) => l !== selectedLocale).map((l) => (
                  <label
                    key={l}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                      border: "1px solid #dcdcde",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!translateTargets[l]}
                      onChange={(e) =>
                        setTranslateTargets((prev) => ({ ...prev, [l]: e.target.checked }))
                      }
                    />
                    {localeNames[l]} ({l.toUpperCase()})
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px" }}>
              {t.cms.title} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleTitleBlur}
              required
              style={{
                width: "100%",
                maxWidth: "600px",
                padding: "6px 10px",
                border: "1px solid #8c8f94",
                borderRadius: "3px",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px" }}>
              {t.cms.slug} *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              style={{
                width: "100%",
                maxWidth: "600px",
                padding: "6px 10px",
                border: "1px solid #8c8f94",
                borderRadius: "3px",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px", fontWeight: "600" }}>
              {t.cms.excerpt}
            </label>
            <RichTextEditor
              value={formData.excerpt || ""}
              onChange={(value) => setFormData({ ...formData, excerpt: value })}
              placeholder={t.cms.excerptPlaceholder}
              toolbarSide="top"
              stickyToolbar
              editorHeight={320}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px", fontWeight: "600" }}>
              {t.cms.content} *
            </label>
            <RichTextEditor
              value={formData.content || ""}
              onChange={(value) => setFormData({ ...formData, content: value })}
              placeholder={t.cms.contentPlaceholder}
              toolbarSide="top"
              stickyToolbar
              editorHeight={520}
            />
          </div>

          <ImageUpload
            value={formData.featuredImage || ""}
            onChange={(url) => setFormData({ ...formData, featuredImage: url })}
            label={t.cms.featuredImage}
          />

          {type === "event" && (
            <>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px" }}>
                  {t.cms.eventDate}
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    type="date"
                    value={getDatePart(typeof formData.eventDate === "string" ? formData.eventDate : toDateTimeLocalValue(formData.eventDate))}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      const current = typeof formData.eventDate === "string" ? formData.eventDate : toDateTimeLocalValue(formData.eventDate);
                      const nextTime = getTimePart(current);
                      setFormData({
                        ...formData,
                        eventDate: (nextDate ? `${nextDate}T${nextTime}` : "") as any,
                      });
                    }}
                    style={{
                      width: "100%",
                      maxWidth: "220px",
                      padding: "6px 10px",
                      border: "1px solid #8c8f94",
                      borderRadius: "3px",
                    }}
                  />
                  <input
                    type="time"
                    value={getTimePart(typeof formData.eventDate === "string" ? formData.eventDate : toDateTimeLocalValue(formData.eventDate))}
                    onChange={(e) => {
                      const nextTime = e.target.value || "00:00";
                      const current = typeof formData.eventDate === "string" ? formData.eventDate : toDateTimeLocalValue(formData.eventDate);
                      const nextDate = getDatePart(current);
                      setFormData({
                        ...formData,
                        eventDate: (nextDate ? `${nextDate}T${nextTime}` : "") as any,
                      });
                    }}
                    style={{
                      width: "100%",
                      maxWidth: "140px",
                      padding: "6px 10px",
                      border: "1px solid #8c8f94",
                      borderRadius: "3px",
                    }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px" }}>
                  {t.cms.eventLocation}
                </label>
                <input
                  type="text"
                  value={formData.eventLocation || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, eventLocation: e.target.value })
                  }
                  style={{
                    width: "100%",
                    maxWidth: "600px",
                    padding: "6px 10px",
                    border: "1px solid #8c8f94",
                    borderRadius: "3px",
                  }}
                />
              </div>
            </>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px" }}>
              {t.cms.status}
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as "draft" | "published",
                })
              }
              style={{
                width: "100%",
                maxWidth: "200px",
                padding: "6px 10px",
                border: "1px solid #8c8f94",
                borderRadius: "3px",
              }}
            >
              <option value="draft">{t.cms.draft}</option>
              <option value="published">{t.cms.published}</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "8px 16px",
                background: "#2271b1",
                color: "white",
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                borderRadius: "3px",
                fontSize: "13px",
              }}
            >
              {saving ? t.cms.saving : t.cms.save}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                padding: "8px 16px",
                background: "#6c757d",
                color: "white",
                border: "none",
                cursor: "pointer",
                borderRadius: "3px",
                fontSize: "13px",
              }}
            >
              {t.cms.cancel}
            </button>
          </div>
        </form>
      </div>
      </CMSLayout>
    </AdminGuard>
  );
}

export default function NewPostPage() {
  // Next.js requires useSearchParams() to be used under a Suspense boundary
  return (
    <Suspense fallback={null}>
      <NewPostPageInner />
    </Suspense>
  );
}
