import Link from "next/link";
import { useI18n } from "~/i18n";
import { TelegramIcon } from "./telegram-icon";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="py-8 bg-[var(--bg-primary)] border-t border-[var(--border-secondary)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]">
              <TelegramIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-semibold text-[var(--text-primary)]">
              Telegram AI Admin
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
            <Link href="#" className="hover:text-[var(--text-primary)] transition-colors">
              {t("landing.footerPrivacy")}
            </Link>
            <Link href="#" className="hover:text-[var(--text-primary)] transition-colors">
              {t("landing.footerTerms")}
            </Link>
            <Link href="#" className="hover:text-[var(--text-primary)] transition-colors">
              {t("landing.footerContact")}
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-sm text-[var(--text-tertiary)]">
            © {new Date().getFullYear()} Telegram AI Admin
          </div>
        </div>
      </div>
    </footer>
  );
}
