"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { getTranslations, type Locale } from "@/lib/getTranslations";

export default function ContactPage() {
  const pathname = usePathname();
  const locale: Locale = (() => {
    const match = pathname?.match(/^\/([^\/]+)/);
    if (match && ["me", "en", "it", "sq"].includes(match[1])) {
      return match[1] as Locale;
    }
    return "me";
  })();
  const t = getTranslations(locale);
  
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setFormData({ name: "", email: "", message: "" });
      } else {
        setError(data.error || t.contact.error);
      }
    } catch (err) {
      setError(t.contact.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="contact-page">
      <div className="container contact-info" data-aos="fade-up">
        <h2>{t.contact.title}</h2>

        <div className="info-cards">
          <div className="card" data-aos="zoom-in" data-aos-delay="100">
            <h4>📞 {t.contact.phone}</h4>
            <p>+382 67 322 441</p>
          </div>
          <div className="card" data-aos="zoom-in" data-aos-delay="200">
            <h4>✉️ {t.contact.email}</h4>
            <p>info@adriaticbgc.org</p>
          </div>
          <div className="card" data-aos="zoom-in" data-aos-delay="300">
            <h4>🏢 {t.contact.companyInfo}</h4>
            <p>
              {t.contact.companyInfoText}
            </p>
          </div>
          <div className="card" data-aos="zoom-in" data-aos-delay="400">
            <h4>📍 {t.contact.address}</h4>
            <p>
              Adriatic Blue Growth Cluster (ABGC)
              <br />
              Put I Bokeške brigade, Dobrota bb
              <br />
              P.O. Box 69
              <br />
              85330 Kotor, Montenegro
            </p>
          </div>
        </div>
      </div>

      <div className="container contact-map" data-aos="fade-up">
        <iframe
          src="https://www.openstreetmap.org/export/embed.html?bbox=18.75,42.42,18.90,42.45&layer=mapnik"
          style={{ border: 0, width: "100%", height: 400 }}
          allowFullScreen
          title="Map"
        />
      </div>

      <div className="container contact-form" data-aos="fade-up">
        <h2>{t.contact.messageUs}</h2>
        {success && (
          <div style={{
            padding: "15px",
            background: "#d4edda",
            color: "#155724",
            borderRadius: "5px",
            marginBottom: "20px"
          }}>
            {t.contact.success}
          </div>
        )}
        {error && (
          <div style={{
            padding: "15px",
            background: "#f8d7da",
            color: "#721c24",
            borderRadius: "5px",
            marginBottom: "20px"
          }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{
          background: "#f8f9fa",
          padding: "30px",
          borderRadius: "10px",
          maxWidth: "600px",
          margin: "0 auto"
        }}>
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="name" style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
              {t.contact.name}
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t.contact.namePlaceholder}
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "5px",
                fontSize: "16px"
              }}
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="email" style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
              {t.contact.email}
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t.contact.emailPlaceholder}
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "5px",
                fontSize: "16px"
              }}
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="message" style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
              {t.contact.message}
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder={t.contact.messagePlaceholder}
              required
              rows={6}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "5px",
                fontSize: "16px",
                fontFamily: "inherit",
                resize: "vertical"
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 24px",
              background: loading ? "#ccc" : "#E23F65",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.3s"
            }}
          >
            {loading ? t.contact.sending : t.contact.send}
          </button>
        </form>
      </div>
    </main>
  );
}
