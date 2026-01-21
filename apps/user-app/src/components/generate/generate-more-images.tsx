import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Spinner } from "~/components/ui/spinner";
import { useI18n } from "~/i18n";

interface GenerateMoreImagesProps {
  onGenerate: (prompt: string, useSvg: boolean) => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function GenerateMoreImages({
  onGenerate,
  isGenerating,
  disabled,
}: GenerateMoreImagesProps) {
  const { t } = useI18n();
  const [customPrompt, setCustomPrompt] = useState("");
  const [useSvg, setUseSvg] = useState(false);

  const handleGenerate = () => {
    if (!customPrompt.trim()) return;
    onGenerate(customPrompt.trim(), useSvg);
    setCustomPrompt("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
        <ImagePlus className="h-4 w-4" />
        {t("postEditor.generateMoreImages")}
      </div>

      <Textarea
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        placeholder={t("postEditor.generateImagePromptPlaceholder")}
        className="min-h-[80px]"
        disabled={disabled || isGenerating}
      />

      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={useSvg}
            onChange={(e) => setUseSvg(e.target.checked)}
            disabled={disabled || isGenerating}
            className="rounded border-[var(--border-primary)]"
          />
          {t("postEditor.generateAsSvg")}
        </label>

        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={disabled || isGenerating || !customPrompt.trim()}
        >
          {isGenerating ? (
            <>
              <Spinner size="sm" />
              {t("common.loading")}
            </>
          ) : (
            <>
              <ImagePlus className="h-4 w-4" />
              {t("postEditor.generateImage")}
            </>
          )}
        </Button>
      </div>

      {useSvg && (
        <p className="text-xs text-[var(--text-tertiary)]">
          {t("postEditor.svgPromptHint")}
        </p>
      )}
    </div>
  );
}
