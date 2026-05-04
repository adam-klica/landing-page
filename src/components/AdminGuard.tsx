"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { localeLink, type Locale } from "@/lib/localeLink";
import { getTranslations } from "@/lib/getTranslations";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
  const t = getTranslations(locale);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      const allowedRoles = ["admin", "moderator", "editor"];
      if (!data.user || !allowedRoles.includes(data.user.role)) {
        router.push(localeLink("/login", locale));
        return;
      }
      setUser(data.user);
    } catch (error) {
      router.push(localeLink("/login", locale));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>{t.cms.loading}</div>
    );
  }

  const allowedRoles = ["admin", "moderator", "editor"];
  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
