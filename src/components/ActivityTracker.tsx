"use client";

import { useEffect, useRef } from "react";

const MIN_INTERVAL_MS = 5 * 60 * 1000;

export function ActivityTracker() {
  const lastActivityRef = useRef<number>(0);

  useEffect(() => {
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < MIN_INTERVAL_MS) return;
      lastActivityRef.current = now;
      fetch("/api/users/activity", { method: "POST", keepalive: true }).catch(() => {});
    };

    updateActivity();

    const onVisibility = () => {
      if (document.visibilityState === "visible") updateActivity();
    };
    const onFocus = () => updateActivity();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
