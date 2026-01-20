import { useState, useMemo } from "react";
import { Image, X } from "lucide-react";
import { useI18n } from "~/i18n";
import type { PostImage } from "~/types";
import { ImageGrid } from "./image-grid";
import { ImagePreviewModal } from "./image-preview-modal";
import { useImageGeneration } from "~/hooks/useImageGeneration";

interface PostImageSelectorProps {
  postImages: PostImage[];
  selectedImages: PostImage[];
  onImagesChange: (images: PostImage[]) => void;
  channelId?: string;
  onImageRegenerated?: (oldUrl: string, newImage: PostImage) => void;
  onPreviewStateChange?: (isPreviewOpen: boolean) => void;
}

export function PostImageSelector({
  postImages,
  selectedImages,
  onImagesChange,
  channelId,
  onImageRegenerated,
  onPreviewStateChange,
}: PostImageSelectorProps) {
  const { t } = useI18n();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const { regeneratingUrl, cleaningUrl, regenerateImage, cleanImage } =
    useImageGeneration({ channelId, onImageRegenerated });

  const originalImages = useMemo(
    () => postImages.filter((img) => !img.isGenerated),
    [postImages]
  );
  const generatedImages = useMemo(
    () => postImages.filter((img) => img.isGenerated),
    [postImages]
  );

  const selectedUrls = useMemo(
    () => new Set(selectedImages.map((img) => img.url)),
    [selectedImages]
  );

  const toggleImage = (image: PostImage) => {
    if (selectedUrls.has(image.url)) {
      onImagesChange(selectedImages.filter((img) => img.url !== image.url));
    } else {
      onImagesChange([...selectedImages, image]);
    }
  };

  const openPreview = (index: number) => {
    setPreviewIndex(index);
    onPreviewStateChange?.(true);
  };

  const closePreview = () => {
    setPreviewIndex(null);
    onPreviewStateChange?.(false);
  };

  const getFullIndex = (localIndex: number, isGenerated: boolean) => {
    return isGenerated ? localIndex : generatedImages.length + localIndex;
  };

  const allImagesForPreview = [...generatedImages, ...originalImages];

  if (postImages.length === 0) return null;

  const canRegenerate = !!channelId && !!onImageRegenerated;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
          <Image className="h-4 w-4" />
          {t("generatePage.selectImages")}
        </span>
        {selectedImages.length > 0 && (
          <button
            type="button"
            onClick={() => onImagesChange([])}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            {t("sources.clearSelection")}
          </button>
        )}
      </div>

      {selectedImages.length === 0 && (
        <p className="text-xs text-[var(--text-tertiary)]">
          {t("generatePage.noImagesSelected")}
        </p>
      )}

      {generatedImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-secondary)]">
            {t("generatePage.imageAnalysis.generatedAlternatives")}
          </p>
          <ImageGrid
            images={generatedImages}
            selectedUrls={selectedUrls}
            onToggle={toggleImage}
            onPreview={(i) => openPreview(getFullIndex(i, true))}
            onRegenerate={canRegenerate ? regenerateImage : undefined}
            regeneratingUrl={regeneratingUrl}
            cleaningUrl={cleaningUrl}
          />
        </div>
      )}

      {originalImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-secondary)]">
            {t("generatePage.imageAnalysis.originalImages")}
          </p>
          <ImageGrid
            images={originalImages}
            selectedUrls={selectedUrls}
            onToggle={toggleImage}
            onPreview={(i) => openPreview(getFullIndex(i, false))}
            onRegenerate={canRegenerate ? regenerateImage : undefined}
            onClean={canRegenerate ? cleanImage : undefined}
            regeneratingUrl={regeneratingUrl}
            cleaningUrl={cleaningUrl}
          />
        </div>
      )}

      {previewIndex !== null && (
        <ImagePreviewModal
          images={allImagesForPreview}
          currentIndex={previewIndex}
          onClose={closePreview}
          onNavigate={setPreviewIndex}
        />
      )}
    </div>
  );
}
