import { redirect } from "next/navigation";
import { AdminBar } from "@/components/AdminBar";
import { getCurrentUser, hasRole } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.role, "editor")) {
    redirect("/en/login");
  }

  return (
    <>
      <AdminBar />
      {children}
    </>
  );
}
