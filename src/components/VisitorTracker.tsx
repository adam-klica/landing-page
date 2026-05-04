"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "tracked-pages";

function alreadyTracked(path: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (set.includes(path)) return true;
    set.push(path);
    if (set.length > 200) set.shift();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(set));
    return false;
  } catch {
    return false;
  }
}

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (alreadyTracked(pathname)) return;

    const payload = JSON.stringify({
      page: pathname,
      referrer: document.referrer || "",
    });

    const timeoutId = setTimeout(() => {
      try {
        if (typeof navigator.sendBeacon === "function") {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/visitors/track", blob);
        } else {
          fetch("/api/visitors/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Silently fail - don't interrupt user experience
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
}
