"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export default function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  const searchParams = useSearchParams();
  
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    const queryString = params.toString();
    return `${baseUrl}${queryString ? `?${queryString}` : ""}`;
  };

  // Calculate which page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Show max 7 page numbers
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 4) {
        // Show first 5 pages, then ellipsis, then last page
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Show first page, ellipsis, then last 5 pages
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="pagination" aria-label="Pagination">
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        marginTop: "40px",
      }}>
        {/* Previous button */}
        {currentPage > 1 ? (
          <Link
            href={createPageUrl(currentPage - 1)}
            className="pagination-btn pagination-prev"
            style={{
              padding: "10px 16px",
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              color: "#333",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f5f5f5";
              e.currentTarget.style.borderColor = "#E23F65";
              e.currentTarget.style.color = "#E23F65";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "#e0e0e0";
              e.currentTarget.style.color = "#333";
            }}
          >
            <span>←</span>
            <span>Previous</span>
          </Link>
        ) : (
          <span
            className="pagination-btn pagination-prev disabled"
            style={{
              padding: "10px 16px",
              background: "#f5f5f5",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              color: "#999",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>←</span>
            <span>Previous</span>
          </span>
        )}

        {/* Page numbers */}
        {pageNumbers.map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                style={{
                  padding: "10px 8px",
                  color: "#999",
                  fontSize: "14px",
                }}
              >
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <Link
              key={pageNum}
              href={createPageUrl(pageNum)}
              className={`pagination-btn ${isActive ? "active" : ""}`}
              style={{
                padding: "10px 16px",
                background: isActive ? "#E23F65" : "#fff",
                border: `1px solid ${isActive ? "#E23F65" : "#e0e0e0"}`,
                borderRadius: "8px",
                color: isActive ? "#fff" : "#333",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: isActive ? "600" : "500",
                transition: "all 0.2s ease",
                minWidth: "44px",
                textAlign: "center",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "#f5f5f5";
                  e.currentTarget.style.borderColor = "#E23F65";
                  e.currentTarget.style.color = "#E23F65";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.color = "#333";
                }
              }}
            >
              {pageNum}
            </Link>
          );
        })}

        {/* Next button */}
        {currentPage < totalPages ? (
          <Link
            href={createPageUrl(currentPage + 1)}
            className="pagination-btn pagination-next"
            style={{
              padding: "10px 16px",
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              color: "#333",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f5f5f5";
              e.currentTarget.style.borderColor = "#E23F65";
              e.currentTarget.style.color = "#E23F65";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "#e0e0e0";
              e.currentTarget.style.color = "#333";
            }}
          >
            <span>Next</span>
            <span>→</span>
          </Link>
        ) : (
          <span
            className="pagination-btn pagination-next disabled"
            style={{
              padding: "10px 16px",
              background: "#f5f5f5",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              color: "#999",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>Next</span>
            <span>→</span>
          </span>
        )}
      </div>
    </nav>
  );
}
