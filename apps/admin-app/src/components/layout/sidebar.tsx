import Link from "next/link";
import { useRouter } from "next/router";
import { LayoutDashboard, Users, ListTodo } from "lucide-react";
import { cn } from "~/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/jobs", label: "Jobs", icon: ListTodo },
];

export function Sidebar() {
  const router = useRouter();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[var(--bg-primary)] border-r border-[var(--border-secondary)] flex flex-col">
      <div className="p-6 border-b border-[var(--border-secondary)]">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Admin Panel</h1>
        <p className="text-sm text-[var(--text-secondary)]">Telegram AI Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = router.pathname === item.href ||
            (item.href !== "/" && router.pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--accent-tertiary)] text-[var(--accent-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--border-secondary)]">
        <p className="text-xs text-[var(--text-tertiary)]">Admin Panel v1.0</p>
      </div>
    </aside>
  );
}
