"use client";

import { useEffect } from "react";
import Script from "next/script";

export function AOSInit() {
  useEffect(() => {
    // Fallback inicijalizacija ako se AOS već učitao
    if (typeof window !== "undefined" && (window as any).AOS) {
      (window as any).AOS.init({ duration: 800, once: true });
    }
  }, []);

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof window !== "undefined" && (window as any).AOS) {
            (window as any).AOS.init({ duration: 800, once: true });
          }
        }}
      />
    </>
  );
}
