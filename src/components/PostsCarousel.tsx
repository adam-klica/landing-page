"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import type { Post } from "@/models/Post";
import { localeLink } from "@/lib/localeLink";
import type { Locale } from "@/lib/i18n";

interface PostsCarouselProps {
  posts: Post[];
  locale: Locale;
  readMoreLabel: string;
  dateField?: "eventDate" | "publishedAt";
}

function formatDate(dateValue?: string | Date): string {
  if (!dateValue) return "";
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

export function PostsCarousel({
  posts,
  locale,
  readMoreLabel,
  dateField = "publishedAt",
}: PostsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = (): void => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [posts.length]);

  const scrollByCards = (dir: 1 | -1): void => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".carousel-card");
    const cardWidth = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * cardWidth * 2, behavior: "smooth" });
  };

  if (posts.length === 0) return null;

  return (
    <div className="posts-carousel">
      <button
        type="button"
        aria-label="Previous"
        className="carousel-arrow carousel-arrow-left"
        onClick={() => scrollByCards(-1)}
        disabled={!canScrollLeft}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="carousel-track" ref={scrollRef}>
        {posts.map((post) => (
          <article key={post._id} className="carousel-card news-item">
            {post.featuredImage && (
              <Link href={localeLink(`/posts/${post.slug}`, locale)}>
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="news-thumb"
                  loading="lazy"
                />
              </Link>
            )}
            <div className="news-meta">
              <span className="news-date">
                {formatDate(
                  dateField === "eventDate"
                    ? post.eventDate || post.publishedAt || post.createdAt
                    : post.publishedAt || post.createdAt
                )}
              </span>
            </div>
            <h3 className="news-item-title">
              <Link href={localeLink(`/posts/${post.slug}`, locale)}>{post.title}</Link>
            </h3>
            <div className="news-button-wrapper">
              <Link href={localeLink(`/posts/${post.slug}`, locale)} className="news-button">
                {readMoreLabel}
              </Link>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        aria-label="Next"
        className="carousel-arrow carousel-arrow-right"
        onClick={() => scrollByCards(1)}
        disabled={!canScrollRight}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
