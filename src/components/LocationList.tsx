"use client";
 
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getTranslations, type Locale } from "@/lib/getTranslations";

interface Country {
  code: string;
  name: string;
}

export default function LocationList() {
  const pathname = usePathname();
  const locale: Locale = (() => {
    const match = pathname?.match(/^\/([^\/]+)/);
    if (match && ["me", "en", "it", "sq"].includes(match[1])) {
      return match[1] as Locale;
    }
    return "me";
  })();
  const t = getTranslations(locale);
  const [countries, setCountries] = useState<Country[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [citiesMap, setCitiesMap] = useState<Record<string, string[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/locations/countries")
      .then((r) => r.json())
      .then((data) => {
        setCountries(data.countries || []);
      })
      .catch((err) => {
        console.error("Failed to load countries:", err);
      });
  }, []);

  async function toggleCountry(code: string) {
    setExpanded((prev) => ({ ...prev, [code]: !prev[code] }));
    if (citiesMap[code]) return;
    setLoadingMap((s) => ({ ...s, [code]: true }));
    try {
      const res = await fetch(`/api/locations/cities?country=${encodeURIComponent(code)}`);
      const data = await res.json();
      setCitiesMap((m) => ({ ...m, [code]: data.cities || [] }));
    } catch (err) {
      console.error("Failed to load cities for", code, err);
      setCitiesMap((m) => ({ ...m, [code]: [] }));
    } finally {
      setLoadingMap((s) => ({ ...s, [code]: false }));
    }
  }

  return (
    <div style={{ marginTop: "24px" }}>
      <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>{t.locationList.title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {countries.map((c) => (
          <div key={c.code} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{c.name}</strong>
              <button
                onClick={() => toggleCountry(c.code)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                {expanded[c.code] ? t.locationList.hide : t.locationList.showCities}
              </button>
            </div>
            {expanded[c.code] && (
              <div style={{ marginTop: 10 }}>
                {loadingMap[c.code] ? (
                  <div style={{ color: "#666" }}>{t.locationList.loadingCities}</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(citiesMap[c.code] || []).map((city) => (
                      <div
                        key={city}
                        style={{
                          padding: "6px 8px",
                          background: "#f7f7f7",
                          borderRadius: 6,
                          fontSize: 13,
                        }}
                      >
                        {city}
                      </div>
                    ))}
                    {(citiesMap[c.code] || []).length === 0 && (
                      <div style={{ color: "#666" }}>{t.locationList.noCitiesAvailable}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

