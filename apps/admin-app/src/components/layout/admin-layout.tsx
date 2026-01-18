import { useEffect } from "react";
import { useRouter } from "next/router";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Spinner } from "~/components/ui";
import { useCurrentAdmin } from "~/hooks/useAuth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { data: admin, isLoading } = useCurrentAdmin();

  useEffect(() => {
    if (!isLoading && !admin) {
      router.push("/login");
    }
  }, [admin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <Sidebar />
      <div className="ml-64">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
