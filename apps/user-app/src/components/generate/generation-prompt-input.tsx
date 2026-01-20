import { useI18n } from "~/i18n";

interface GenerationPromptInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function GenerationPromptInput({ value, onChange }: GenerationPromptInputProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-[var(--text-primary)]">
        {t("generatePage.customGuidance")}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("generatePage.customGuidancePlaceholder")}
        className="w-full min-h-[80px] rounded-[var(--radius-md)] border border-[var(--border-secondary)]/50 bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors duration-150 hover:border-[var(--border-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none mt-2"
        rows={3}
      />
      <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
        {t("generatePage.customGuidanceHint")}
      </p>
    </div>
  );
}
