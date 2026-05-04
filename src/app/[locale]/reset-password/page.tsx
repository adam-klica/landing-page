"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { type Locale } from "@/lib/i18n";
import { getTranslations } from "@/lib/getTranslations";
import { localeLink } from "@/lib/localeLink";

function ResetPasswordContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale: Locale = (pathname?.match(/^\/([^\/]+)/)?.[1] as Locale) || "me";
  const t = getTranslations(locale);
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t.resetPassword.invalidOrMissing);
    }
  }, [token, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(t.resetPassword.invalidOrMissing);
      return;
    }

    if (password.length < 6) {
      setError(t.resetPassword.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.resetPassword.passwordsDoNotMatch);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(localeLink("/login", locale));
        }, 2000);
      } else {
        setError(data.error || t.resetPassword.failedToReset);
      }
    } catch (error) {
      setError(t.resetPassword.errorOccurred);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}>
        <div style={{
          maxWidth: "500px",
          width: "100%",
          background: "#fff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}>
          <h2 style={{ fontSize: "24px", marginBottom: "20px", color: "#b32d2e" }}>
            {t.resetPassword.invalidToken}
          </h2>
          <p style={{ marginBottom: "20px", color: "#666" }}>
            {t.resetPassword.invalidTokenMessage}
          </p>
          <Link
            href={localeLink("/forgot-password", locale)}
            style={{
              color: "#0073e6",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            {t.resetPassword.requestNewLink}
          </Link>
        </div>
      </main>
    );
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
        {success ? (
          <div style={{ textAlign: "center" }}>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "600",
              color: "#46b450",
              marginBottom: "20px"
            }}>
              {t.resetPassword.success}
            </h2>
            <p style={{ color: "#666", marginBottom: "20px" }}>
              {t.resetPassword.successMessage}
            </p>
          </div>
        ) : (
          <>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "600",
              color: "#E23F65",
              textAlign: "center",
              marginBottom: "10px"
            }}>
              {t.resetPassword.title}
            </h2>

            <p style={{
              textAlign: "center",
              color: "#666",
              fontSize: "14px",
              marginBottom: "30px",
              lineHeight: "1.6"
            }}>
              {t.resetPassword.description}
            </p>

            {error && (
              <div style={{
                padding: "12px",
                background: "#fce8e6",
                border: "1px solid #f28b82",
                borderRadius: "6px",
                color: "#c5221f",
                marginBottom: "20px",
                fontSize: "14px"
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#333"
                }}>
                  {t.resetPassword.newPassword}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                  placeholder={t.resetPassword.newPasswordPlaceholder}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#333"
                }}>
                  {t.resetPassword.confirmPassword}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "16px",
                    boxSizing: "border-box"
                  }}
                  placeholder={t.resetPassword.confirmPasswordPlaceholder}
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
                {loading ? t.resetPassword.resetting : t.resetPassword.resetPassword}
              </button>
            </form>

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
                {t.resetPassword.backToLogin}
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}>
        <div style={{
          maxWidth: "500px",
          width: "100%",
          background: "#fff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}>
          <p>Loading...</p>
        </div>
      </main>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
