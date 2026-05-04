"use client";

import { useState, useEffect } from "react";
import { CMSLayout } from "@/components/CMSLayout";
import { AdminGuard } from "@/components/AdminGuard";
import type { Post } from "@/models/Post";
import { getTranslations } from "@/lib/getTranslations";
import { defaultLocale, locales, type Locale } from "@/lib/i18n";
import { getStoredCmsLocale } from "@/lib/cmsLocale";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>({});
  const [cmsLocale, setCmsLocale] = useState<Locale>(defaultLocale);
  const t = getTranslations(cmsLocale);

  useEffect(() => {
    setCmsLocale(getStoredCmsLocale());
    loadStats();
  }, []);

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

  async function loadStats() {
    try {
      const [news, events, users] = await Promise.all([
        fetch("/api/posts?type=news&status=published").then((r) => r.json()),
        fetch("/api/posts?type=event&status=published").then((r) => r.json()),
        fetch("/api/admin/users").then((r) => r.json()),
      ]);

      // Count unique posts by slug (not all locale versions)
      const uniqueNewsSlugs = new Set((news.posts || []).map((p: Post) => p.slug));
      const uniqueEventSlugs = new Set((events.posts || []).map((p: Post) => p.slug));

      setStats({
        news: uniqueNewsSlugs.size,
        events: uniqueEventSlugs.size,
        resources: 0,
        users: users.users?.length || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  return (
    <AdminGuard>
      <CMSLayout>
        <div className="cms-dashboard-container">
          <h1 className="cms-dashboard-title">
            {t.cms.dashboardTitle}
          </h1>

          <div className="cms-dashboard-grid">
            <div className="cms-stat-card">
              <span className="cms-stat-icon">📰</span>
              <div className="cms-stat-value">
                {stats.news || 0}
              </div>
              <div className="cms-stat-label">{t.cms.newsPosts}</div>
            </div>

            <div className="cms-stat-card">
              <span className="cms-stat-icon">📅</span>
              <div className="cms-stat-value">
                {stats.events || 0}
              </div>
              <div className="cms-stat-label">{t.cms.events}</div>
            </div>

            <div className="cms-stat-card">
              <span className="cms-stat-icon">👥</span>
              <div className="cms-stat-value">
                {stats.users || 0}
              </div>
              <div className="cms-stat-label">{t.cms.users}</div>
            </div>
          </div>

          <div className="cms-dashboard-section">
            <h2 className="cms-dashboard-section-title">
              {t.cms.quickActions}
            </h2>
            <div className="cms-quick-actions">
              <a href="/admin/posts?type=news" className="cms-action-button">
                {t.cms.manageNews}
              </a>
              <a href="/admin/posts?type=event" className="cms-action-button">
                {t.cms.manageEvents}
              </a>
              <a href="/admin/users" className="cms-action-button">
                {t.cms.manageUsers}
              </a>
            </div>
          </div>
        </div>
      </CMSLayout>
    </AdminGuard>
  );
}

