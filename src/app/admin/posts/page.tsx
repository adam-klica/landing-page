"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Post } from "@/models/Post";
import { CMSLayout } from "@/components/CMSLayout";
import { AdminGuard } from "@/components/AdminGuard";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ImageUpload } from "@/components/ImageUpload";
import { locales, localeNames, localeFlags, localeFlagEmojis, type Locale, defaultLocale } from "@/lib/i18n";
import { getTranslations } from "@/lib/getTranslations";
import { localeLink } from "@/lib/localeLink";
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

function PostsPageInner() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<Locale | "all">("all");
  const [cmsLocale, setCmsLocale] = useState<Locale>(defaultLocale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "news";
  const editId = searchParams.get("edit");

  // Load CMS locale from localStorage
  useEffect(() => {
    setCmsLocale(getStoredCmsLocale());
  }, []);

  // Listen for locale changes from CMSLayout
  useEffect(() => {
    const handleLocaleChange = () => {
      setCmsLocale(getStoredCmsLocale());
    };
    window.addEventListener("storage", handleLocaleChange);
    window.addEventListener("cms-locale-changed", handleLocaleChange);
    return () => {
      window.removeEventListener("storage", handleLocaleChange);
      window.removeEventListener("cms-locale-changed", handleLocaleChange);
    };
  }, []);

  const t = getTranslations(cmsLocale);

  useEffect(() => {
    loadPosts();
  }, [type]);

  // Auto-open edit modal if editId is in URL
  useEffect(() => {
    if (editId && posts.length > 0) {
      const postToEdit = posts.find((p) => p._id === editId);
      if (postToEdit) {
        setEditingPost(postToEdit);
        setShowForm(true);
        // Remove edit param from URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("edit");
        router.replace(newUrl.pathname + newUrl.search);
      }
    }
  }, [editId, posts, router]);

  async function loadPosts() {
    setLoading(true);
    try {
      // Load all posts of the selected type (regardless of locale)
      // This way we can see all posts in CMS and manage them
      let res = await fetch(`/api/posts?type=${type}&limit=100`);
      let data = await res.json();
      
      if (!data.posts || data.posts.length === 0) {
        // If no posts found, try loading all posts
        const allRes = await fetch(`/api/posts?type=all&limit=100`);
        const allData = await allRes.json();
        if (allData.posts && allData.posts.length > 0) {
          // Filter posts that match type
          const filtered = allData.posts.filter((p: any) => 
            (!p.type || p.type === type || type === "all")
          );
          setPosts(filtered);
          return;
        }
      }
      
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!id) {
      console.error("Cannot delete: post ID is missing");
      alert(`${t.cms.errorLabel}: ${t.cms.postIdMissing}`);
      return;
    }

    const confirmMessage = t.cms.confirmDelete;
    if (!confirm(confirmMessage)) return;

    try {
      if (CMS_DEBUG) console.log(`[DELETE] Attempting to delete post with ID: ${id}`);
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      
      let responseData;
      try {
        responseData = await res.json();
      } catch (parseError) {
        console.error(`[DELETE] Failed to parse response:`, parseError);
        const text = await res.text();
        console.error(`[DELETE] Response text:`, text);
        alert(`${t.cms.deleteFailed}: ${t.cms.invalidServerResponse} (${res.status})`);
        return;
      }
      
      if (CMS_DEBUG) console.log(`[DELETE] Response status: ${res.status}`, responseData);
      
      if (res.ok) {
        if (CMS_DEBUG) console.log(`[DELETE] Successfully deleted post: ${id}`);
        alert(`${t.cms.postDeleted}. ${responseData.deletedCount ? `(${responseData.deletedCount} ${t.cms.postDeletedCount})` : ""}`);
        loadPosts();
      } else {
        console.error(`[DELETE] Failed to delete post: ${responseData.error || 'Unknown error'}`);
        const errorMessage = responseData.error || `Server error (${res.status})`;
        alert(`${t.cms.deleteFailed}: ${errorMessage}${res.status === 403 ? `\n\n${t.cms.deletePermissionHint}` : ""}`);
      }
    } catch (error: any) {
      console.error("[DELETE] Error deleting post:", error);
      alert(`${t.cms.deleteFailed}: ${error.message || t.cms.unknownError}\n\n${t.cms.checkConsoleHint}`);
    }
  }

  async function handleRepublish(id: string) {
    if (!confirm(t.cms.republishConfirm)) return;

    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "published",
          republish: true, // Flag to indicate republish
        }),
      });
      if (res.ok) {
        loadPosts();
        alert(t.cms.republishSuccess);
      } else {
        const error = await res.json();
        alert(`${t.cms.errorLabel}: ${error.error || t.cms.republishError}`);
      }
    } catch (error) {
      console.error("Error republishing post:", error);
      alert(t.cms.republishError);
    }
  }

  async function handleEdit(post: Post) {
    // If post doesn't have content, fetch full post data
    if (!post.content && post._id) {
      try {
        const res = await fetch(`/api/posts/${post._id}`);
        if (res.ok) {
          const fullPost = await res.json();
          setEditingPost(fullPost);
          setShowForm(true);
          return;
        }
      } catch (error) {
        console.error("Error fetching full post:", error);
      }
    }
    // Use post from list if it already has content
    setEditingPost(post);
    setShowForm(true);
  }

  function handleNew() {
    setEditingPost(null);
    setShowForm(true);
  }

  const viewLocale: Locale | null = selectedLocale === "all" ? null : (selectedLocale as Locale);

  const hasLocale = (post: any, loc: Locale) => {
    if (post?.locale === loc) return true;
    const meta = post?.metadata;
    const title = meta?.titleTranslations?.[loc];
    const content = meta?.contentTranslations?.[loc];
    const excerpt = meta?.excerptTranslations?.[loc];
    return (
      (typeof title === "string" && title.trim().length > 0) ||
      (typeof content === "string" && content.trim().length > 0) ||
      (typeof excerpt === "string" && excerpt.trim().length > 0)
    );
  };

  const getTitleForLocale = (post: any, loc: Locale | null) => {
    if (!loc) return post.title;
    const meta = post?.metadata;
    return (
      meta?.titleTranslations?.[loc] ||
      post.title
    );
  };

  const visiblePosts = viewLocale
    ? posts.filter((p: any) => hasLocale(p, viewLocale))
    : posts;

  return (
    <AdminGuard>
      <CMSLayout>
      <div className="cms-form-container" style={{ background: "white", padding: "20px", borderRadius: "4px" }}>
        <div
          className="cms-header-actions"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <h1 
            style={{ 
              margin: 0, 
              fontSize: "23px", 
              fontWeight: "400",
              opacity: loading ? 0.5 : 1,
              transition: "opacity 0.3s ease",
            }}
          >
            {type === "news" && t.cms.news}
            {type === "event" && t.cms.events} {t.cms.posts}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <label style={{ fontSize: "13px", color: "#50575e" }}>
              {t.cms.viewLanguage}:
              <select
                value={selectedLocale}
                onChange={(e) => setSelectedLocale(e.target.value as any)}
                style={{
                  marginLeft: "8px",
                  padding: "6px 10px",
                  border: "1px solid #8c8f94",
                  borderRadius: "3px",
                  fontSize: "13px",
                  background: "white",
                }}
              >
                <option value="all">{t.cms.all}</option>
                {locales.map((l) => (
                  <option key={l} value={l}>
                    {localeNames[l]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            onClick={handleNew}
            style={{
              background: "#2271b1",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#135e96";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2271b1";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {t.cms.addNew}
          </button>
        </div>

        {showForm && (
          <PostForm
            post={editingPost}
            type={type as "news" | "event"}
            currentLocale={(cmsLocale || defaultLocale) as Locale}
            onClose={() => {
              setShowForm(false);
              setEditingPost(null);
            }}
            onSave={() => {
              loadPosts();
              setShowForm(false);
              setEditingPost(null);
            }}
          />
        )}

        {loading ? (
          <div style={{ 
            padding: "40px", 
            textAlign: "center",
            opacity: 0.6,
            animation: "fadeIn 0.3s ease-in",
          }}>
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
        ) : (
          <div
            style={{
              opacity: loading ? 0 : 1,
              transition: "opacity 0.3s ease",
              animation: "slideIn 0.3s ease-out",
            }}
          >
            <div className="cms-table-wrapper">
              <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "white",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #c3c4c7" }}>
                <th
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    fontWeight: "400",
                    fontSize: "15px",
                    color: "#50575e",
                  }}
                >
                  {t.cms.title}
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    fontWeight: "400",
                    fontSize: "15px",
                    color: "#50575e",
                  }}
                >
                  {t.cms.status}
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    fontWeight: "400",
                    fontSize: "15px",
                    color: "#50575e",
                  }}
                >
                  {t.cms.date}
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    fontWeight: "400",
                    fontSize: "15px",
                    color: "#50575e",
                  }}
                >
                  {t.cms.views}
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    fontWeight: "400",
                    fontSize: "15px",
                    color: "#50575e",
                  }}
                >
                  {t.cms.publishedBy}
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    fontWeight: "400",
                    fontSize: "15px",
                    color: "#50575e",
                  }}
                >
                  {t.cms.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {visiblePosts.map((post) => (
                <tr
                  key={post._id}
                  style={{
                    borderBottom: "1px solid #f0f0f1",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f6f7f7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  <td style={{ padding: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {viewLocale ? (
                        <span title={`Viewing: ${localeNames[viewLocale]}`}>{localeFlagEmojis[viewLocale]}</span>
                      ) : post.locale && (
                        <img 
                          src={localeFlags[post.locale as Locale] || localeFlags[defaultLocale]} 
                          alt={post.locale}
                          style={{ width: "18px", height: "13px", objectFit: "cover", borderRadius: "2px" }}
                        />
                      )}
                      <strong style={{ fontSize: "15px" }}>{getTitleForLocale(post, viewLocale)}</strong>
                    </div>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "3px",
                        fontSize: "13px",
                        background:
                          post.status === "published" ? "#00a32a" : "#dba617",
                        color: "white",
                      }}
                    >
                      {post.status === "published" ? t.cms.published : t.cms.draft}
                    </span>
                  </td>
                  <td style={{ padding: "10px", fontSize: "14px", color: "#50575e" }}>
                    {post.createdAt
                      ? new Date(post.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td style={{ padding: "10px", fontSize: "14px", color: "#50575e", textAlign: "center" }}>
                    {post.viewCount !== undefined ? post.viewCount : 0}
                  </td>
                  <td style={{ padding: "10px", fontSize: "14px", color: "#50575e" }}>
                    {post.publishedByName || "-"}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <a
                      href={localeLink(
                        `/posts/${post.slug}`,
                        (viewLocale || cmsLocale || (post.locale as Locale) || defaultLocale) as Locale
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#1d7f45",
                        cursor: "pointer",
                        fontSize: "14px",
                        padding: "0 5px",
                        textDecoration: "underline",
                      }}
                    >
                      {t.cms.view}
                    </a>
                    |
                    <button
                      onClick={() => handleEdit(post)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#2271b1",
                        cursor: "pointer",
                        fontSize: "14px",
                        padding: "0 5px",
                        textDecoration: "underline",
                      }}
                    >
                      {t.cms.edit}
                    </button>
                    {post.status === "published" && (
                      <>
                        |
                        <button
                          onClick={() => post._id && handleRepublish(post._id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#00a32a",
                            cursor: "pointer",
                            fontSize: "14px",
                            padding: "0 5px",
                            textDecoration: "underline",
                          }}
                        >
                          {t.cms.republish}
                        </button>
                      </>
                    )}
                    |
                    <button
                      onClick={() => post._id && handleDelete(post._id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#b32d2e",
                        cursor: "pointer",
                        fontSize: "14px",
                        padding: "0 5px",
                        textDecoration: "underline",
                      }}
                    >
                      {t.cms.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div style={{ marginTop: "2rem" }}>
            <p 
              style={{ 
                color: "#666",
                animation: "fadeIn 0.5s ease-in",
                marginBottom: "15px",
              }}
            >
              {t.cms.noPosts}
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={async () => {
                  if (confirm(t.cms.migrateConfirm)) {
                    try {
                      const res = await fetch("/api/posts/migrate", { method: "POST" });
                      const data = await res.json();
                      if (res.ok) {
                        alert(`${t.cms.migrationComplete} ${data.message}`);
                        loadPosts();
                      } else {
                        alert(`${t.cms.errorLabel}: ${data.error}`);
                      }
                    } catch (error) {
                      alert(t.cms.migrationError);
                    }
                  }
                }}
                style={{
                  padding: "8px 16px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {t.cms.migrateExistingPosts}
              </button>
            </div>
          </div>
        )}

      </div>
      </CMSLayout>
    </AdminGuard>
  );
}

export default function PostsPage() {
  // Next.js requires useSearchParams() to be used under a Suspense boundary
  return (
    <Suspense fallback={null}>
      <PostsPageInner />
    </Suspense>
  );
}

function PostForm({
  post,
  type,
  onClose,
  onSave,
  currentLocale,
}: {
  post: Post | null;
  type: "news" | "event";
  onClose: () => void;
  onSave: () => void;
  currentLocale: Locale;
}) {
  const [cmsLocale, setCmsLocale] = useState<Locale>(defaultLocale);

  // Load CMS locale from localStorage
  useEffect(() => {
    setCmsLocale(getStoredCmsLocale());
  }, []);

  // Listen for locale changes
  useEffect(() => {
    const handleLocaleChange = () => {
      setCmsLocale(getStoredCmsLocale());
    };
    window.addEventListener("storage", handleLocaleChange);
    window.addEventListener("cms-locale-changed", handleLocaleChange);
    return () => {
      window.removeEventListener("storage", handleLocaleChange);
      window.removeEventListener("cms-locale-changed", handleLocaleChange);
    };
  }, []);

  const t = getTranslations(cmsLocale);
  const [formData, setFormData] = useState<Partial<Post>>({
    title: post?.title || "",
    slug: post?.slug || "",
    content: post?.content || "",
    excerpt: post?.excerpt || "",
    featuredImage: post?.featuredImage || "",
    status: post?.status || "draft",
    type: type,
    eventDate: toDateTimeLocalValue(post?.eventDate) as any,
    eventLocation: post?.eventLocation || "",
    locale: post?.locale || currentLocale,
  });

  const [saving, setSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<Locale>((post?.locale || currentLocale) as Locale);
  const [userPickedLocale, setUserPickedLocale] = useState(false);
  const [translateOnSave, setTranslateOnSave] = useState(false);
  const [translateToLocales, setTranslateToLocales] = useState<Locale[]>([]);

  const allLocales: Locale[] = ["me", "en", "it", "sq"];
  const baseLocale: Locale = (post?.locale || currentLocale) as Locale;
  const isTranslationEdit = !!post && selectedLocale !== baseLocale;

  // Default "edit language" to the currently selected CMS locale when the modal opens.
  // Keep user override if they manually changed it.
  useEffect(() => {
    if (userPickedLocale) return;
    const preferred = getStoredCmsLocale();
    if (preferred && locales.includes(preferred)) {
      setSelectedLocale(preferred);
    }
    // Only run once per modal open (post changes when you open a new modal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post]);

  const getLocaleField = (loc: Locale, field: "title" | "content" | "excerpt"): string => {
    if (!post) return (formData as any)[field] || "";
    if (loc === baseLocale) return ((post as any)[field] || "") as string;
    const meta: any = post.metadata;
    const key = field + "Translations";
    return (meta?.[key]?.[loc] || "") as string;
  };

  const getTranslationStatus = (loc: Locale) => {
    const meta: any = post?.metadata;
    const tTitle = meta?.titleTranslations?.[loc];
    const tContent = meta?.contentTranslations?.[loc];
    const tExcerpt = meta?.excerptTranslations?.[loc];
    return (
      (typeof tTitle === "string" && tTitle.trim().length > 0) ||
      (typeof tContent === "string" && tContent.trim().length > 0) ||
      (typeof tExcerpt === "string" && tExcerpt.trim().length > 0)
    );
  };

  // When locale changes, load that locale's version from metadata (or base fields)
  useEffect(() => {
    if (!post) {
      setFormData((prev) => ({ ...prev, locale: selectedLocale }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      locale: baseLocale, // base locale of the post never changes here
      slug: post.slug || prev.slug || "",
      title: getLocaleField(selectedLocale, "title") || "",
      content: getLocaleField(selectedLocale, "content") || "",
      excerpt: getLocaleField(selectedLocale, "excerpt") || "",
      featuredImage: post.featuredImage || prev.featuredImage || "",
      status: post.status || prev.status || "draft",
      eventLocation: post.eventLocation || prev.eventLocation || "",
      eventDate: (toDateTimeLocalValue((post as any).eventDate) || prev.eventDate || "") as any,
    }));

    // Slug should be edited only in base locale
    setSlugManuallyEdited(true);
  }, [selectedLocale, post, baseLocale]);

  // Reset slugManuallyEdited when editing existing post
  useEffect(() => {
    if (post) {
      setSlugManuallyEdited(!!post.slug);
    } else {
      setSlugManuallyEdited(false);
    }
  }, [post]);

  // Better modal UX: close on ESC and prevent background page scroll
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function handleTitleChange(title: string) {
    setFormData((prev) => ({
      ...prev,
      title,
      // Only auto-generate slug when editing base locale (not translations)
      slug: isTranslationEdit ? prev.slug : (slugManuallyEdited ? prev.slug : generateSlug(title)),
    }));
  }

  function handleTitleBlur() {
    // When user finishes typing title, ensure slug is generated
    if (!isTranslationEdit && !slugManuallyEdited && formData.title) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(prev.title || ""),
      }));
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

      // Prepare data for API (auto-translation happens on server side)
      const postData: any = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || "",
        featuredImage: formData.featuredImage || "",
        type: type,
        status: formData.status || "draft",
        eventLocation: formData.eventLocation || "",
      };

      if (translateOnSave && translateToLocales.length > 0) {
        postData.translateToLocales = translateToLocales;
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

      // Determine if this is an update or create
      // post._id should be a string (from MongoDB ObjectId.toString())
      const postId = post?._id;
      const isUpdate = postId && typeof postId === "string" && postId.trim() !== "";
      const url = isUpdate ? `/api/posts/${postId}` : "/api/posts";
      
      if (CMS_DEBUG) {
        console.log("Post ID check:", {
          postId,
          isUpdate,
          type: typeof postId,
          postObject: post,
          postIdValue: post?._id,
        });
      }
      const method = isUpdate ? "PUT" : "POST";

      if (isUpdate) {
        // Editing a specific locale version (metadata.*Translations)
        postData.editLocale = selectedLocale;
        // Only allow slug changes when editing base locale
        if (!isTranslationEdit) {
          postData.slug = formData.slug;
        }
      } else {
        // Creating a new post: locale is the base locale
        postData.slug = formData.slug;
        postData.locale = selectedLocale;
      }

      if (CMS_DEBUG) {
        console.log("Saving post:", { isUpdate, url, method, postData });
        console.log("🌐 [BROWSER] Sending request to:", url, "with locale:", postData.locale);
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      let data;
      try {
        data = await res.json();
        if (CMS_DEBUG) {
          console.log("🌐 [BROWSER] Response received:", {
            status: res.status,
            ok: res.ok,
            hasTranslations: !!data.metadata?.titleTranslations,
            translationDebug: data.translationDebug,
          });
        }
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        alert(`${t.cms.errorLabel}: ${t.cms.invalidServerResponse}`);
        setSaving(false);
        return;
      }

      if (res.ok) {
        // Check if translations were created
        if (CMS_DEBUG && data.metadata?.titleTranslations) {
          console.log("✅ [BROWSER] Translations received:", {
            titleTranslations: Object.keys(data.metadata.titleTranslations),
            contentTranslations: Object.keys(data.metadata.contentTranslations || {}),
            excerptTranslations: Object.keys(data.metadata.excerptTranslations || {}),
          });
        } else if (CMS_DEBUG) {
          console.warn("⚠️ [BROWSER] No translations in response!");
        }
        
        // Wait a bit for the database to update
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Reload posts to show the newly created/updated post
        onSave();
      } else {
        if (CMS_DEBUG) {
          console.error("❌ [BROWSER] Save error response:", { status: res.status, data });
          // Log full error details for debugging in local dev.
          console.error("Full error data:", JSON.stringify(data, null, 2));
          console.error("Request data sent:", postData);
        }
        const errorMessage = data?.error || data?.message || `Server error (${res.status})`;
        alert(`${t.cms.errorLabel}: ${errorMessage}\n\n${t.cms.statusCode}: ${res.status}\n\n${t.cms.checkConsoleHint}`);
      }
    } catch (error: any) {
      console.error("Error saving post:", error);
      alert(`${t.cms.saveFailed}: ${error.message || t.cms.unknownError}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="cms-modal-overlay"
      onClick={onClose}
    >
      <div
        className="cms-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cms-modal-header">
          <h2 className="cms-modal-title">{post ? t.cms.modalEdit : t.cms.modalCreate} {type}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              className="cms-button cms-button-secondary"
              style={{ margin: 0 }}
            >
              {t.cms.cancel}
            </button>
            <button
              type="submit"
              form="post-edit-form"
              disabled={saving}
              className="cms-button cms-button-primary"
              style={{ margin: 0 }}
            >
              {saving ? t.cms.saving : t.cms.save}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="cms-modal-close"
            >
              ×
            </button>
          </div>
        </div>
        <form
          id="post-edit-form"
          className="cms-modal-body"
          onSubmit={handleSubmit}
        >
          <div className="cms-form-section">
            <div className="cms-form-group">
              <label className="cms-form-label cms-form-label-required">
                {t.cms.language}
              </label>
              <select
                className="cms-form-select cms-language-select"
                value={selectedLocale || ""}
                onChange={(e) => {
                  const newLocale = e.target.value as Locale;
                  if (newLocale) {
                    setUserPickedLocale(true);
                    setSelectedLocale(newLocale);
                    setFormData({ ...formData, locale: newLocale });
                  }
                }}
                required
              >
                <option value="" disabled>{t.cms.pleaseSelectLanguage}</option>
                {locales.map((locale) => (
                  <option key={locale} value={locale}>
                    {localeNames[locale]} ({locale.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="cms-translation-section">
            <div className="cms-translation-header">
              <label className="cms-translation-checkbox-label">
                <input
                  type="checkbox"
                  checked={translateOnSave}
                  onChange={(e) => setTranslateOnSave(e.target.checked)}
                />
                {t.cms.translateOnSave}
              </label>
              <span className="cms-translation-source">
                {t.cms.source}: <strong>{localeNames[selectedLocale]}</strong>
              </span>
            </div>

            <div className="cms-translation-targets">
              <div className="cms-translation-targets-label">{t.cms.translateTo}:</div>
              <div className="cms-translation-targets-list">
                {allLocales
                  .filter((l) => l !== selectedLocale)
                  .map((l) => {
                    const already = getTranslationStatus(l);
                    const checked = translateToLocales.includes(l);
                    return (
                      <label key={l} className="cms-translation-target-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!translateOnSave}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? Array.from(new Set([...translateToLocales, l]))
                              : translateToLocales.filter((x) => x !== l);
                            setTranslateToLocales(next);
                          }}
                        />
                        <span>{localeFlagEmojis[l]} {localeNames[l]}</span>
                        {already && (
                          <span className="cms-translation-badge">
                            {t.cms.hasTranslation}
                          </span>
                        )}
                      </label>
                    );
                  })}
              </div>
              {!translateOnSave && (
                <div className="cms-translation-hint">
                  {t.cms.enableTranslateHint}
                </div>
              )}
            </div>
          </div>

          <div className="cms-form-section">
            <h3 className="cms-form-section-title">Basic Information</h3>
            
            <div className="cms-form-group">
              <label className="cms-form-label cms-form-label-required">
                {t.cms.title}
              </label>
              <input
                type="text"
                className="cms-form-input"
                value={formData.title || ""}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleBlur}
                required
              />
            </div>

            <div className="cms-form-group">
              <label className="cms-form-label cms-form-label-required">
                {t.cms.slug}
              </label>
              <input
                type="text"
                className="cms-form-input"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                disabled={isTranslationEdit}
              />
              {isTranslationEdit && (
                <div className="cms-translation-hint" style={{ marginTop: "8px" }}>
                  {t.cms.baseLanguageSlugHint} ({localeNames[baseLocale]}).
                </div>
              )}
            </div>
          </div>

          <div className="cms-form-section">
            <h3 className="cms-form-section-title">Content</h3>
            
            <div className="cms-form-group">
              <label className="cms-form-label">
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
            
            <div className="cms-form-group">
              <label className="cms-form-label cms-form-label-required">
                {t.cms.content}
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
          </div>

          <div className="cms-form-section">
            <h3 className="cms-form-section-title">Media</h3>
            
            <div className="cms-form-group">
              <ImageUpload
                value={formData.featuredImage || ""}
                onChange={(url) => setFormData({ ...formData, featuredImage: url })}
                label={t.cms.featuredImage}
              />
            </div>
          </div>

          {type === "event" && (
            <div className="cms-form-section">
              <h3 className="cms-form-section-title">Event Details</h3>
              
              <div className="cms-form-group">
                <label className="cms-form-label">
                  {t.cms.eventDate}
                </label>
                <div className="cms-event-datetime">
                  <input
                    type="date"
                    className="cms-form-input"
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
                  />
                  <input
                    type="time"
                    className="cms-form-input"
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
                  />
                </div>
              </div>
              
              <div className="cms-form-group">
                <label className="cms-form-label">
                  {t.cms.eventLocation}
                </label>
                <input
                  type="text"
                  className="cms-form-input"
                  value={formData.eventLocation || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, eventLocation: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <div className="cms-form-section">
            <h3 className="cms-form-section-title">Settings</h3>
            
            <div className="cms-form-group">
              <label className="cms-form-label">
                {t.cms.status}
              </label>
              <select
                className="cms-form-select"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "draft" | "published",
                  })
                }
                style={{ maxWidth: "200px" }}
              >
                <option value="draft">{t.cms.draft}</option>
                <option value="published">{t.cms.published}</option>
              </select>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
