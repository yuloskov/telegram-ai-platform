import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Spinner } from "~/components/ui/spinner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from "~/components/ui/modal";
import { MessagePreview } from "~/components/telegram/message-bubble";
import { SourcePostCard } from "~/components/generate/source-post-card";
import { PostImageSelector } from "~/components/generate/post-image-selector";
import { useI18n } from "~/i18n";
import type { PostImage } from "~/stores/generation-store";

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

interface PostEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  channelName: string;
  isGenerated: boolean;
  sources?: SourceContent[];
  selectedImages?: PostImage[];
  onImagesChange?: (images: PostImage[]) => void;
}

export function PostEditorModal({
  open,
  onOpenChange,
  content,
  onContentChange,
  onSave,
  onCancel,
  isSaving,
  channelName,
  isGenerated,
  sources,
  selectedImages,
  onImagesChange,
}: PostEditorModalProps) {
  const { t } = useI18n();
  const [showSources, setShowSources] = useState(false);

  const validSources = sources?.filter((s) => s.text || s.media.length > 0) ?? [];
  const hasImageSources = validSources.some((s) => s.media.some((m) => m.type.startsWith("image")));

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>
            {isGenerated ? t("postEditor.titleReview") : t("postEditor.titleCreate")}
          </ModalTitle>
        </ModalHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Editor */}
          <div>
            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={t("postEditor.placeholder")}
              className="min-h-[200px]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              {content.length} {t("postEditor.charactersCount")}
            </p>
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-2">{t("postEditor.preview")}</p>
            {content ? (
              <MessagePreview content={content} channelName={channelName} />
            ) : (
              <div className="bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)] p-4 text-center text-sm text-[var(--text-tertiary)]">
                {t("postEditor.previewEmpty")}
              </div>
            )}
          </div>
        </div>

        {/* Image selector */}
        {isGenerated && hasImageSources && onImagesChange && (
          <div className="border-t border-[var(--border-secondary)] pt-4 mt-4">
            <PostImageSelector
              selectedImages={selectedImages ?? []}
              onImagesChange={onImagesChange}
              sources={validSources}
            />
          </div>
        )}

        {/* Sources section */}
        {validSources.length > 0 && (
          <div className="border-t border-[var(--border-secondary)] pt-4 mt-4">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showSources ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {t("generatePage.sourcesUsed", { count: validSources.length })}
            </button>

            {showSources && (
              <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
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

        <ModalFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSave} disabled={!content || isSaving}>
            {isSaving ? (
              <>
                <Spinner size="sm" />
                {t("postEditor.saving")}
              </>
            ) : (
              t("postEditor.saveAsDraft")
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
