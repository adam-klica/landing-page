"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { type Locale } from "@/lib/i18n";
import { getTranslations } from "@/lib/getTranslations";
import { localeLink } from "@/lib/localeLink";

export default function ForgotPasswordPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale: Locale = (pathname?.match(/^\/([^\/]+)/)?.[1] as Locale) || "me";
  const t = getTranslations(locale);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || t.login.forgotPasswordError || "Failed to send reset email");
      }
    } catch (error) {
      setError(t.login.errorOccurred);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "60vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.9) 100%)"
    }}>
      <div style={{
        maxWidth: "500px",
        width: "100%",
        background: "#fff",
        padding: "40px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        border: "1px solid #e0e0e0"
      }}>
        <h2 style={{
          fontSize: "28px",
          fontWeight: "600",
          color: "#E23F65",
          textAlign: "center",
          marginBottom: "10px"
        }}>
          {t.login.forgotPasswordTitle || "Zaboravili ste lozinku?"}
        </h2>

        <p style={{
          textAlign: "center",
          color: "#666",
          fontSize: "14px",
          marginBottom: "30px",
          lineHeight: "1.6"
        }}>
          {t.login.forgotPasswordDescription || "Unesite vašu email adresu i poslaćemo vam link za resetovanje lozinke."}
        </p>

        {success ? (
          <div style={{
            padding: "20px",
            background: "#e8f5e9",
            border: "1px solid #4caf50",
            borderRadius: "8px",
            marginBottom: "20px",
            textAlign: "center"
          }}>
            <p style={{ color: "#2e7d32", marginBottom: "15px", fontSize: "16px" }}>
              ✅ {t.login.forgotPasswordSuccess || "Email sa uputstvima za resetovanje lozinke je poslat na vašu email adresu."}
            </p>
            <Link
              href={localeLink("/login", locale)}
              style={{
                color: "#0073e6",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "14px"
              }}
            >
              ← {t.login.backToLogin || "Nazad na prijavu"}
            </Link>
          </div>
        ) : (
          <>
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
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label htmlFor="email" style={{
                  display: "block",
                  fontWeight: "500",
                  marginBottom: "6px",
                  color: "#444",
                  fontSize: "14px"
                }}>
                  {t.login.email || "Email adresa"}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t.login.emailPlaceholder || "unesite@email.com"}
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
                  transition: "background 0.2s",
                  marginBottom: "20px"
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
                {loading ? (t.login.sending || "Šalje se...") : (t.login.sendResetLink || "Pošalji link za resetovanje")}
              </button>
            </form>
          </>
        )}

        <div style={{
          textAlign: "center",
          paddingTop: "20px",
          borderTop: "1px solid #e0e0e0"
        }}>
          <Link
            href={localeLink("/login", locale)}
            style={{
              color: "#0073e6",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            ← {t.login.backToLogin || "Nazad na prijavu"}
          </Link>
        </div>
      </div>
    </main>
  );
}
