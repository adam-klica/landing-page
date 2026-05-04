"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { type Locale } from "@/lib/i18n";
import { getTranslations } from "@/lib/getTranslations";
import { localeLink } from "@/lib/localeLink";

interface LoginFormProps {
  locale: Locale;
}

export function LoginForm({ locale }: LoginFormProps) {
  const t = getTranslations(locale);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        router.push(localeLink("/dashboard", locale));
        router.refresh();
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
    <section style={{
      padding: "60px 20px",
      background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.9) 100%)"
    }}>
      <div className="container" style={{ 
        maxWidth: "500px", 
        margin: "0 auto" 
      }}>
        <h2 style={{
          fontSize: "32px",
          fontWeight: "600",
          color: "#E23F65",
          textAlign: "center",
          marginBottom: "30px"
        }}>
          {t.login.title}
        </h2>

        {error && (
          <div style={{
            padding: "12px",
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: "8px",
            marginBottom: "20px",
            color: "#c33",
            fontSize: "14px"
          }}>
            ❌ {t.login.error}: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{
          background: "#fff",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          border: "1px solid #e0e0e0"
        }}>
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="login-username" style={{
              display: "block",
              fontWeight: "500",
              marginBottom: "6px",
              color: "#444",
              fontSize: "14px"
            }}>
              {t.login.usernameOrEmail}
            </label>
            <input
              type="text"
              id="login-username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                fontSize: "15px",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label htmlFor="login-password" style={{
              display: "block",
              fontWeight: "500",
              marginBottom: "6px",
              color: "#444",
              fontSize: "14px"
            }}>
              {t.login.password}
            </label>
            <input
              type="password"
              id="login-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                fontSize: "15px",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ 
            marginBottom: "20px"
          }}>
            <div style={{ 
              textAlign: "right",
              marginBottom: "8px"
            }}>
              <Link 
                href={localeLink("/forgot-password", locale)}
                style={{ 
                  color: "#0073e6", 
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                🔑 {t.login.forgotPassword}
              </Link>
            </div>
            <p style={{
              fontSize: "12px",
              color: "#666",
              textAlign: "right",
              margin: 0,
              lineHeight: "1.4"
            }}>
              {t.login.forgotPasswordText}
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#ccc" : "#0073aa",
              color: "#fff",
              border: "none",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#005f8a";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#0073aa";
              }
            }}
          >
            {loading ? t.login.submitting : t.login.submit}
          </button>

          <p style={{ 
            textAlign: "center", 
            marginTop: "20px", 
            fontSize: "14px", 
            color: "#666" 
          }}>
            {t.login.noAccount}{" "}
            <a 
              href={localeLink("/", locale)}
              style={{ 
                color: "#0073e6", 
                textDecoration: "none",
                fontWeight: "600"
              }}
            >
              {t.login.registerHere}
            </a>
          </p>
        </form>
      </div>
    </section>
  );
}
