import { Edit2, Save, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { TelegramHtml } from "~/components/telegram/telegram-html";
import { useI18n } from "~/i18n";
import { useState } from "react";
import { SourcePostCard } from "./source-post-card";
import { PostImageGallery } from "./post-image-gallery";
import { ImageStrategyBadge } from "./image-strategy-badge";
import type { ImageDecision, PostImage } from "~/stores/generation-store";

interface SourceMedia {
  url: string;
  type: string;
}

interface SourceContent {
  id: string;
  text: string | null;
  telegramLink: string;
  media: SourceMedia[];
}

interface GeneratedPostCardProps {
  content: string;
  angle: string;
  index: number;
  sources: SourceContent[];
  imageDecision?: ImageDecision;
  images?: PostImage[];
  onEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
  isSaved: boolean;
}

export function GeneratedPostCard({
  content,
  angle,
  sources,
  imageDecision,
  images,
  onEdit,
  onSave,
  isSaving,
  isSaved,
}: GeneratedPostCardProps) {
  const { t } = useI18n();
  const [showSources, setShowSources] = useState(false);

  const validSources = sources.filter((s) => s.text || s.media.length > 0);
  const hasImages = images && images.length > 0;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-secondary)] bg-[var(--bg-primary)] flex flex-col h-full">
      {/* Image gallery */}
      {hasImages && (
        <div className="p-3 pb-0">
          <PostImageGallery images={images} />
        </div>
      )}

      {/* Image strategy badge */}
      {imageDecision && (
        <div className="px-4 pt-2">
          <ImageStrategyBadge
            strategy={imageDecision.strategy}
            imageCount={images?.length ?? 0}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex-1">
        {angle && (
          <div className="mb-3 pb-3 border-b border-[var(--border-secondary)]">
            <span className="text-sm font-medium text-[var(--accent-primary)]">
              {angle}
            </span>
          </div>
        )}
        <div className="text-sm text-[var(--text-primary)] leading-relaxed">
          <TelegramHtml content={content} />
        </div>
      </div>

      {/* Sources toggle */}
      {validSources.length > 0 && (
        <div className="border-t border-[var(--border-secondary)]">
          <button
            onClick={() => setShowSources(!showSources)}
            className="w-full px-4 py-2 flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            {showSources ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {t("generatePage.sourcesUsed", { count: validSources.length })}
          </button>

          {showSources && (
            <div className="px-4 pb-3 space-y-3 max-h-80 overflow-y-auto">
              {validSources.map((source) => (
                <SourcePostCard
                  key={source.id}
                  text={source.text}
                  telegramLink={source.telegramLink}
                  media={source.media}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-[var(--border-secondary)] flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8"
          title={t("common.edit")}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant={isSaved ? "ghost" : "default"}
          size="sm"
          onClick={onSave}
          disabled={isSaving || isSaved}
          className="min-w-[80px]"
        >
          {isSaved ? (
            <>
              <Check className="h-4 w-4" />
              {t("generatePage.saved")}
            </>
          ) : isSaving ? (
            t("postEditor.saving")
          ) : (
            <>
              <Save className="h-4 w-4" />
              {t("common.save")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
