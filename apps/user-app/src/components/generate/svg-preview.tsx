// SVG preview component with regenerate/accept controls

import { Check, RefreshCw, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { useI18n } from "~/i18n";

interface SVGPreviewProps {
  svg: string | null;
  pngUrl: string | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  onAccept: () => void;
  onCancel?: () => void;
}

export function SVGPreview({
  svg,
  pngUrl,
  isGenerating,
  onRegenerate,
  onAccept,
  onCancel,
}: SVGPreviewProps) {
  const { t } = useI18n();

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] border border-[var(--border-primary)]">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          {t("svgGeneration.generating")}
        </p>
      </div>
    );
  }

  if (!svg && !pngUrl) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="relative bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] border border-[var(--border-primary)] overflow-hidden">
        {pngUrl ? (
          <img
            src={pngUrl}
            alt="Generated SVG preview"
            className="w-full max-w-md mx-auto aspect-square object-contain"
          />
        ) : svg ? (
          <div
            className="w-full max-w-md mx-auto aspect-square p-4"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>
        )}
        <Button variant="secondary" onClick={onRegenerate}>
          <RefreshCw className="h-4 w-4" />
          {t("svgGeneration.regenerate")}
        </Button>
        <Button onClick={onAccept}>
          <Check className="h-4 w-4" />
          {t("svgGeneration.accept")}
        </Button>
      </div>
    </div>
  );
}
