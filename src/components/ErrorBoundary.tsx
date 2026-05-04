"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    // Log to console with more details
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Component stack:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      const error = this.state.error;
      const isDev = process.env.NODE_ENV === "development";
      
      return (
        <div style={{ 
          padding: "40px 20px", 
          textAlign: "center",
          maxWidth: "600px",
          margin: "0 auto",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
          <h2 style={{ fontSize: "24px", marginBottom: "16px", color: "#333" }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: "16px", color: "#666", marginBottom: "24px" }}>
            Please refresh the page or try again later.
          </p>
          
          {isDev && error && (
            <details style={{ 
              textAlign: "left", 
              marginBottom: "24px",
              padding: "16px",
              background: "#f5f5f5",
              borderRadius: "8px",
              fontSize: "14px"
            }}>
              <summary style={{ cursor: "pointer", fontWeight: "600", marginBottom: "8px" }}>
                Error Details (Development Only)
              </summary>
              <div style={{ marginTop: "12px" }}>
                <p><strong>Error:</strong> {error.message}</p>
                {error.stack && (
                  <pre style={{ 
                    overflow: "auto", 
                    background: "#fff", 
                    padding: "12px", 
                    borderRadius: "4px",
                    fontSize: "12px",
                    marginTop: "8px"
                  }}>
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}
          
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              style={{
                padding: "12px 24px",
                backgroundColor: "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#0051cc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#0070f3";
              }}
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                padding: "12px 24px",
                backgroundColor: "#666",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#666";
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
