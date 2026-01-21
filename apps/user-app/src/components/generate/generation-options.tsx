// Generation options component - post count selector, image type toggle, SVG settings, and auto-regenerate

import { Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";
import { ImageTypeToggle, type ImageType } from "./image-type-toggle";
import { SVGSettingsInline } from "./svg-settings-inline";
import type { SvgGenerationSettings } from "~/hooks/useSvgSettings";

interface GenerationOptionsProps {
  postCount: number;
  onPostCountChange: (count: number) => void;
  autoRegenerate: boolean;
  onAutoRegenerateChange: (value: boolean) => void;
  regenerateAllImages: boolean;
  onRegenerateAllImagesChange: (value: boolean) => void;
  imageType: ImageType;
  onImageTypeChange: (type: ImageType) => void;
  svgSettings: SvgGenerationSettings;
  onSvgSettingUpdate: <K extends keyof SvgGenerationSettings>(key: K, value: SvgGenerationSettings[K]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
}

export function GenerationOptions({
  postCount,
  onPostCountChange,
  autoRegenerate,
  onAutoRegenerateChange,
  regenerateAllImages,
  onRegenerateAllImagesChange,
  imageType,
  onImageTypeChange,
  svgSettings,
  onSvgSettingUpdate,
  onGenerate,
  isGenerating,
  canGenerate,
}: GenerationOptionsProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Settings section - left aligned, column layout */}
      <div className="flex flex-col gap-4">
        {/* Image Type Toggle */}
        <div className="flex items-center gap-3">
          <ImageTypeToggle
            value={imageType}
            onChange={onImageTypeChange}
            disabled={isGenerating}
          />
        </div>

        {/* SVG Style Settings - shown when SVG is selected */}
        {imageType === "svg" && (
          <SVGSettingsInline
            settings={svgSettings}
            onUpdate={onSvgSettingUpdate}
            disabled={isGenerating}
          />
        )}

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
                disabled={isGenerating}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  postCount === count
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                } ${count > 1 ? "border-l border-[var(--border-primary)]" : ""} ${
                  isGenerating ? "opacity-50 cursor-not-allowed" : ""
                }`}
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
            disabled={isGenerating || regenerateAllImages}
            className="h-4 w-4 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
          />
          <span className={`text-sm ${regenerateAllImages ? "text-[var(--text-tertiary)]" : "text-[var(--text-secondary)]"}`}>
            {t("generatePage.autoRegenerate")}
          </span>
        </label>

        {/* Regenerate all images checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={regenerateAllImages}
            onChange={(e) => onRegenerateAllImagesChange(e.target.checked)}
            disabled={isGenerating}
            className="h-4 w-4 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
          />
          <span className="text-sm text-[var(--text-secondary)]">
            {t("generatePage.regenerateAllImages")}
          </span>
        </label>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border-primary)]" />

      {/* Generate button - centered, visually distinct */}
      <div className="flex justify-center pt-2">
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
    </div>
  );
}
