"use client";

import { useEffect, useRef } from "react";

interface PostContentProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export function PostContent({ content, className = "post-content", style }: PostContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const applyListStyles = () => {
      const container = containerRef.current;
      if (!container) return;

      // Process ul lists
      const uls = container.querySelectorAll("ul");
      uls.forEach((ul) => {
        const ulEl = ul as HTMLElement;
        ulEl.style.cssText = "list-style: none !important; margin: 1em 0 1em 2em !important; padding: 0 !important;";

        const lis = ul.querySelectorAll("li");
        lis.forEach((li) => {
          const liEl = li as HTMLElement;
          
          // Skip if already processed
          if (liEl.dataset.processed === "true") return;
          liEl.dataset.processed = "true";

          liEl.style.cssText = "margin: 0.5em 0 !important; padding: 0 0 0 0.5em !important; position: relative !important; list-style: none !important;";

          // Remove existing bullet if any
          const existingBullet = liEl.querySelector(".list-bullet");
          if (existingBullet) existingBullet.remove();

          // Add bullet point
          const bullet = document.createElement("span");
          bullet.className = "list-bullet";
          bullet.textContent = "•";
          bullet.style.cssText = "position: absolute !important; left: -1.5em !important; color: #333 !important; font-weight: bold !important; font-size: 1.2em !important; line-height: 1.6 !important;";
          liEl.insertBefore(bullet, liEl.firstChild);
        });
      });

      // Process ol lists
      const ols = container.querySelectorAll("ol");
      ols.forEach((ol) => {
        const olEl = ol as HTMLElement;
        olEl.style.cssText = "list-style: none !important; margin: 1em 0 1em 2em !important; padding: 0 !important;";

        const lis = ol.querySelectorAll("li");
        let counter = 0;
        lis.forEach((li) => {
          counter++;
          const liEl = li as HTMLElement;
          
          // Skip if already processed
          if (liEl.dataset.processed === "true") return;
          liEl.dataset.processed = "true";

          liEl.style.cssText = "margin: 0.5em 0 !important; padding: 0 0 0 0.5em !important; position: relative !important; list-style: none !important;";

          // Remove existing number if any
          const existingNumber = liEl.querySelector(".list-number");
          if (existingNumber) existingNumber.remove();

          // Add number
          const number = document.createElement("span");
          number.className = "list-number";
          number.textContent = `${counter}.`;
          number.style.cssText = "position: absolute !important; left: -2em !important; color: #333 !important; font-weight: normal !important; text-align: right !important; min-width: 1.5em !important; line-height: 1.6 !important;";
          liEl.insertBefore(number, liEl.firstChild);
        });
      });
    };

    // Apply immediately
    applyListStyles();

    // Use MutationObserver to handle dynamic content
    const observer = new MutationObserver(() => {
      applyListStyles();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });
    }

    // Also apply after delays to catch any late-rendered content
    const timeouts = [
      setTimeout(applyListStyles, 50),
      setTimeout(applyListStyles, 200),
      setTimeout(applyListStyles, 500),
    ];

    return () => {
      observer.disconnect();
      timeouts.forEach(clearTimeout);
    };
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
