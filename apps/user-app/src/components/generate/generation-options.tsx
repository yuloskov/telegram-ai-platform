// Generation options component - post count selector and auto-regenerate toggle

import { Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";

interface GenerationOptionsProps {
  postCount: number;
  onPostCountChange: (count: number) => void;
  autoRegenerate: boolean;
  onAutoRegenerateChange: (value: boolean) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
}

export function GenerationOptions({
  postCount,
  onPostCountChange,
  autoRegenerate,
  onAutoRegenerateChange,
  onGenerate,
  isGenerating,
  canGenerate,
}: GenerationOptionsProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center gap-4 pt-2">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
        {/* Post count selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
            {t("generatePage.postCount")}
          </span>
          <div className="flex rounded-[var(--radius-md)] border border-[var(--border-primary)] overflow-hidden">
            {[1, 2, 3, 4, 5].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onPostCountChange(count)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  postCount === count
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                } ${count > 1 ? "border-l border-[var(--border-primary)]" : ""}`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-regenerate checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRegenerate}
            onChange={(e) => onAutoRegenerateChange(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
          />
          <span className="text-sm text-[var(--text-secondary)]">
            {t("generatePage.autoRegenerate")}
          </span>
        </label>
      </div>

      <Button
        size="lg"
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating}
      >
        <Sparkles className={`h-5 w-5 ${isGenerating ? "animate-pulse" : ""}`} />
        {isGenerating
          ? t("generate.generating")
          : t("generatePage.generatePosts", { count: postCount })}
      </Button>
    </div>
  );
}
