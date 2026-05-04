"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getTranslations, type Locale } from "@/lib/getTranslations";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  // Extract locale from pathname
  const locale: Locale = (pathname?.match(/^\/([^\/]+)/)?.[1] as Locale) || "me";
  const t = getTranslations(locale);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        await new Promise(resolve => setTimeout(resolve, 100));

        const role = data?.user?.role;
        const adminRoles = ["admin", "moderator", "editor"];
        window.location.href = adminRoles.includes(role) ? "/admin" : `/${locale}`;
      } else {
        setError(data.error || t.login.loginFailed);
      }
    } catch (error) {
      setError(t.login.errorOccurred);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-wrapper">
        <h2 className="login-title">{t.login.title}</h2>

        {error && <p className="login-error">❌ {t.login.error}: {error}</p>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">{t.login.usernameOrEmail}</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t.login.password}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="login-forgot-wrapper">
            <Link 
              href={`/${locale}/forgot-password`}
              className="login-forgot-link"
            >
              {t.login.forgotPassword}
            </Link>
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? t.login.submitting : t.login.submit}
          </button>
        </form>

        <p className="login-register-link">
          {t.login.noAccount} <a href={`/${locale}`}>{t.login.registerHere}</a>
        </p>
      </div>
    </main>
  );
}
