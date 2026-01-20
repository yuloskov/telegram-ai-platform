// Image grid item component - extracted from post-image-selector.tsx

import { Check, Expand, RefreshCw, Sparkles } from "lucide-react";
import { useI18n } from "~/i18n";
import type { PostImage } from "~/types";
import { ImageAnalysisBadge } from "./image-analysis-badge";

export interface ImageGridItemProps {
  image: PostImage;
  index: number;
  isSelected: boolean;
  isRegenerating: boolean;
  isCleaning: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onRegenerate?: () => void;
  onClean?: () => void;
}

export function ImageGridItem({
  image,
  index,
  isSelected,
  isRegenerating,
  isCleaning,
  onToggle,
  onPreview,
  onRegenerate,
  onClean,
}: ImageGridItemProps) {
  const { t } = useI18n();
  const isProcessing = isRegenerating || isCleaning;

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onToggle}
        disabled={isProcessing}
        className={`relative aspect-square rounded-[var(--radius-sm)] overflow-hidden border-2 transition-all w-full ${
          isSelected
            ? "border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20"
            : "border-transparent hover:border-[var(--border-primary)]"
        } ${isProcessing ? "opacity-50" : ""}`}
      >
        <img
          src={image.url}
          alt={`Image ${index + 1}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <ImageAnalysisBadge
          analysisResult={image.analysisResult}
          isGenerated={image.isGenerated}
        />
        {isSelected && (
          <div className="absolute inset-0 bg-[var(--accent-primary)]/20 flex items-center justify-center">
            <div className="bg-[var(--accent-primary)] rounded-full p-1">
              <Check className="h-3 w-3 text-white" />
            </div>
          </div>
        )}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            {isCleaning ? (
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
            ) : (
              <RefreshCw className="h-5 w-5 text-white animate-spin" />
            )}
          </div>
        )}
      </button>

      {/* Action buttons overlay */}
      <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Preview button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="p-1 rounded bg-black/60 text-white hover:bg-black/80 transition-colors"
          title={t("generatePage.imageActions.preview")}
        >
          <Expand className="h-3 w-3" />
        </button>

        {/* Clean button */}
        {onClean && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClean();
            }}
            disabled={isProcessing}
            className="p-1 rounded bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-50"
            title={t("generatePage.imageActions.clean")}
          >
            <Sparkles className={`h-3 w-3 ${isCleaning ? "animate-pulse" : ""}`} />
          </button>
        )}

        {/* Regenerate button */}
        {onRegenerate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRegenerate();
            }}
            disabled={isProcessing}
            className="p-1 rounded bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-50"
            title={t("generatePage.imageActions.regenerate")}
          >
            <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
    </div>
  );
}
