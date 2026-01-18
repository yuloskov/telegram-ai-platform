import * as React from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useI18n, type Language } from "~/i18n";

interface AppHeaderProps {
  user?: {
    displayName?: string | null;
    username?: string | null;
  } | null;
  onLogout?: () => void;
}

export function AppHeader({ user, onLogout }: AppHeaderProps) {
  const { t, language, setLanguage } = useI18n();
  const [langMenuOpen, setLangMenuOpen] = React.useState(false);
  const langMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(event.target as Node)
      ) {
        setLangMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setLangMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[var(--border-secondary)] bg-[var(--bg-primary)] px-4 md:px-6">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]">
          <TelegramIcon className="h-5 w-5 text-white" />
        </div>
        <span className="text-base font-semibold text-[var(--text-primary)]">
          {t("header.appName")}
        </span>
      </Link>

      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <div className="relative" ref={langMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="gap-1.5"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t(`language.${language}` as const)}
            </span>
          </Button>

          {langMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-primary)] py-1 shadow-lg">
              <button
                onClick={() => handleLanguageChange("en")}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-secondary)]",
                  language === "en"
                    ? "text-[var(--accent-primary)] font-medium"
                    : "text-[var(--text-primary)]"
                )}
              >
                {t("language.en")}
              </button>
              <button
                onClick={() => handleLanguageChange("ru")}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-secondary)]",
                  language === "ru"
                    ? "text-[var(--accent-primary)] font-medium"
                    : "text-[var(--text-primary)]"
                )}
              >
                {t("language.ru")}
              </button>
            </div>
          )}
        </div>

        {user && (
          <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">
            {user.displayName || user.username || t("common.user")}
          </span>
        )}
        {onLogout && (
          <Button variant="ghost" size="sm" onClick={onLogout}>
            {t("header.logout")}
          </Button>
        )}
      </div>
    </header>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2">
          <ol className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            {breadcrumbs.map((item, index) => (
              <li key={index} className="flex items-center gap-1.5">
                {index > 0 && <span className="text-[var(--text-tertiary)]">/</span>}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-[var(--text-tertiary)]">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {title}
        </h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
