import { useState } from "react";
import { ChevronDown, ChevronRight, Images } from "lucide-react";
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
import { GenerateMoreImages } from "~/components/generate/generate-more-images";
import { EditWithAI } from "~/components/posts/edit-with-ai";
import { useGenerateNewImage } from "~/hooks/useImageGeneration";
import { useEditWithAI } from "~/hooks/useEditWithAI";
import { useI18n } from "~/i18n";
import { getMediaSrc, getValidMediaUrls } from "~/lib/media";
import type { PostImage, SourceContent, MediaFile } from "~/types";

interface PostEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  channelName: string;
  channelId?: string;
  isGenerated: boolean;
  sources?: SourceContent[];
  postImages?: PostImage[];
  selectedImages?: PostImage[];
  onImagesChange?: (images: PostImage[]) => void;
  onImageRegenerated?: (oldUrl: string, newImage: PostImage) => void;
  onNewImageGenerated?: (newImage: PostImage) => void;
  existingMedia?: MediaFile[];
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
  channelId,
  isGenerated,
  sources,
  postImages,
  selectedImages,
  onImagesChange,
  onImageRegenerated,
  onNewImageGenerated,
  existingMedia,
}: PostEditorModalProps) {
  const { t } = useI18n();
  const [showSources, setShowSources] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const generateNewImageMutation = useGenerateNewImage(onNewImageGenerated);
  const editWithAIMutation = useEditWithAI(onContentChange);

  const handleGenerateImage = (prompt: string, useSvg: boolean) => {
    if (!channelId) return;
    generateNewImageMutation.mutate({
      channelId,
      prompt,
      useSvg,
    });
  };

  const handleEditWithAI = (instruction: string) => {
    if (!channelId || !content) return;
    editWithAIMutation.mutate({
      channelId,
      currentContent: content,
      editInstruction: instruction,
    });
  };

  const validSources = sources?.filter((s) => s.text || s.media.length > 0) ?? [];
  const hasImages = (postImages?.length ?? 0) > 0;

  const existingUrls = existingMedia?.map((mf) => mf.url) ?? [];
  const validExistingUrls = getValidMediaUrls(existingUrls);
  const validExistingMedia = existingMedia?.filter((mf) => validExistingUrls.includes(mf.url)) ?? [];

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-3xl max-h-[90vh] overflow-y-auto" preventClose={isPreviewOpen}>
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

        {/* Edit with AI */}
        {channelId && content && (
          <div className="border-t border-[var(--border-secondary)] pt-4 mt-4">
            <EditWithAI
              onEdit={handleEditWithAI}
              isEditing={editWithAIMutation.isPending}
              disabled={isSaving}
            />
          </div>
        )}

        {/* Existing media display (for editing existing posts) */}
        {validExistingMedia.length > 0 && (
          <div className="border-t border-[var(--border-secondary)] pt-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-3">
              <Images className="h-4 w-4" />
              {t("postEditor.attachedMedia", { count: validExistingMedia.length })}
            </div>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: validExistingMedia.length === 1 ? "1fr" : "repeat(2, 1fr)",
              }}
            >
              {validExistingMedia.map((mf) => (
                <div
                  key={mf.id}
                  className="relative rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-tertiary)]"
                >
                  <img
                    src={getMediaSrc(mf.url)}
                    alt=""
                    className="w-full h-auto max-h-48 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image selector */}
        {isGenerated && hasImages && onImagesChange && (
          <div className="border-t border-[var(--border-secondary)] pt-4 mt-4">
            <PostImageSelector
              postImages={postImages ?? []}
              selectedImages={selectedImages ?? []}
              onImagesChange={onImagesChange}
              channelId={channelId}
              postContent={content}
              onImageRegenerated={onImageRegenerated}
              onPreviewStateChange={setIsPreviewOpen}
            />
          </div>
        )}

        {/* Generate more images */}
        {channelId && onNewImageGenerated && (
          <div className="border-t border-[var(--border-secondary)] pt-4 mt-4">
            <GenerateMoreImages
              onGenerate={handleGenerateImage}
              isGenerating={generateNewImageMutation.isPending}
              disabled={isSaving}
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
