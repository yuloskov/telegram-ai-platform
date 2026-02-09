import { useI18n } from "~/i18n";
import { User, Newspaper } from "lucide-react";

interface PersonaModeToggleProps {
  value: string;
  onChange: (mode: string) => void;
}

export function PersonaModeToggle({ value, onChange }: PersonaModeToggleProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--text-primary)]">
        {t("persona.modeLabel")}
      </label>
      <p className="text-xs text-[var(--text-tertiary)] mb-3">
        {t("persona.modeDescription")}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange("standard")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
            value === "standard"
              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
              : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-secondary)]"
          }`}
        >
          <Newspaper className="h-4 w-4" />
          {t("persona.modeStandard")}
        </button>
        <button
          type="button"
          onClick={() => onChange("personal_blog")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
            value === "personal_blog"
              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
              : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-secondary)]"
          }`}
        >
          <User className="h-4 w-4" />
          {t("persona.modePersonalBlog")}
        </button>
      </div>
    </div>
  );
}
