"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export function ConditionalHeaderFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Hide header and footer in CMS
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  // For chat page, show header but hide footer (check with locale prefix)
  const isChatPage = pathname?.match(/^\/[^\/]+\/chat/);
  if (isChatPage) {
    return (
      <>
        <Header />
        {children}
      </>
    );
  }

  // For regular pages, wrap with Header and Footer
  return (
    <>
      <Header />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', flex: 1 }}>
        <main style={{ flex: '1 0 auto', minHeight: 0 }}>
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
