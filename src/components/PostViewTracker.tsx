"use client";

import { useEffect, useRef } from "react";

interface PostViewTrackerProps {
  postId: string;
}

export function PostViewTracker({ postId }: PostViewTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    // Track post view only once per page load
    if (trackedRef.current || !postId) {
      return;
    }

    const trackView = async () => {
      try {
        await fetch(`/api/posts/${postId}/view`, {
          method: "POST",
        });
        trackedRef.current = true;
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.error("Error tracking post view:", error);
      }
    };

    // Small delay to ensure page is fully loaded
    const timeoutId = setTimeout(trackView, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [postId]);

  return null;
}
