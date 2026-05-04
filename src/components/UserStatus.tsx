"use client";

import { useEffect, useState } from "react";

interface UserStatusProps {
  userId: string;
  size?: "small" | "medium" | "large";
}

export function UserStatus({ userId, size = "medium" }: UserStatusProps) {
  const [status, setStatus] = useState<"online" | "away" | "offline">("offline");

  useEffect(() => {
    if (!userId) return;

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/users/activity?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status || "offline");
        }
      } catch (error) {
        console.error("Error fetching user status:", error);
      }
    }

    fetchStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const sizeMap = {
    small: "8px",
    medium: "12px",
    large: "16px",
  };

  const colorMap = {
    online: "#22c55e", // green
    away: "#eab308", // yellow
    offline: "#ef4444", // red
  };

  return (
    <div
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        borderRadius: "50%",
        background: colorMap[status],
        border: "2px solid white",
        position: "absolute",
        bottom: 0,
        right: 0,
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }}
      title={status && typeof status === "string" ? status.charAt(0).toUpperCase() + status.slice(1) : "Offline"}
    />
  );
}
