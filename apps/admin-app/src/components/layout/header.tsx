import { LogOut, User } from "lucide-react";
import { Button } from "~/components/ui";
import { useLogout } from "~/hooks/useAuth";

export function Header() {
  const logout = useLogout();

  return (
    <header className="h-16 bg-[var(--bg-primary)] border-b border-[var(--border-secondary)] flex items-center justify-between px-6">
      <div />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <User className="h-4 w-4" />
          <span>admin</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
