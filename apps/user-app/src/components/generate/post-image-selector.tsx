import { useState } from "react";
import { Check, Image, X, Expand, RefreshCw, Sparkles } from "lucide-react";
import { useI18n } from "~/i18n";
import type { PostImage } from "~/stores/generation-store";
import { ImageAnalysisBadge } from "./image-analysis-badge";
import { ImagePreviewModal } from "./image-preview-modal";

interface PostImageSelectorProps {
  /** Images attached to this post (from API response) */
  postImages: PostImage[];
  /** Currently selected images */
  selectedImages: PostImage[];
  onImagesChange: (images: PostImage[]) => void;
  /** Channel ID for regeneration */
  channelId?: string;
  /** Callback when an image is regenerated */
  onImageRegenerated?: (oldUrl: string, newImage: PostImage) => void;
  /** Callback when preview state changes (to prevent parent modal from closing) */
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
  const [regeneratingUrl, setRegeneratingUrl] = useState<string | null>(null);
  const [cleaningUrl, setCleaningUrl] = useState<string | null>(null);

  const openPreview = (index: number) => {
    setPreviewIndex(index);
    onPreviewStateChange?.(true);
  };

  const closePreview = () => {
    setPreviewIndex(null);
    onPreviewStateChange?.(false);
  };

  // Separate original and generated images
  const originalImages = postImages.filter((img) => !img.isGenerated);
  const generatedImages = postImages.filter((img) => img.isGenerated);

  const isSelected = (url: string) =>
    selectedImages.some((img) => img.url === url);

  const toggleImage = (image: PostImage) => {
    if (isSelected(image.url)) {
      onImagesChange(selectedImages.filter((img) => img.url !== image.url));
    } else {
      onImagesChange([...selectedImages, image]);
    }
  };

  const clearAll = () => {
    onImagesChange([]);
  };

  const handlePreview = (index: number) => {
    openPreview(index);
  };

  const handleRegenerate = async (image: PostImage) => {
    if (!channelId || !onImageRegenerated) return;

    setRegeneratingUrl(image.url);
    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          prompt: image.prompt,
          suggestedPrompt: image.analysisResult?.suggestedPrompt,
          originalImageUrl: image.isGenerated ? image.originalUrl : image.url,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const newImage: PostImage = {
          url: data.data.url,
          isGenerated: true,
          prompt: data.data.prompt,
          originalUrl: image.isGenerated ? image.originalUrl : image.url,
        };
        onImageRegenerated(image.url, newImage);
      } else {
        // Show error to user
        alert(data.error || "Failed to regenerate image");
      }
    } catch (error) {
      console.error("Failed to regenerate image:", error);
      alert("Failed to regenerate image. Please try again.");
    } finally {
      setRegeneratingUrl(null);
    }
  };

  const handleClean = async (image: PostImage) => {
    if (!channelId || !onImageRegenerated) return;

    setCleaningUrl(image.url);
    try {
      // Call the API with mode: "clean" to edit the source image and remove watermarks
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          originalImageUrl: image.url,
          mode: "clean",
        }),
      });

      const data = await response.json();
      if (data.success) {
        const newImage: PostImage = {
          url: data.data.url,
          isGenerated: true,
          prompt: data.data.prompt,
          originalUrl: image.url,
        };
        onImageRegenerated(image.url, newImage);
      } else {
        alert(data.error || "Failed to clean image");
      }
    } catch (error) {
      console.error("Failed to clean image:", error);
      alert("Failed to clean image. Please try again.");
    } finally {
      setCleaningUrl(null);
    }
  };

  if (postImages.length === 0) {
    return null;
  }

  // Calculate index in full array for preview
  const getFullIndex = (sectionImages: PostImage[], localIndex: number, isGenerated: boolean) => {
    if (isGenerated) {
      return localIndex;
    }
    return generatedImages.length + localIndex;
  };

  // All images in preview order (generated first, then original)
  const allImagesForPreview = [...generatedImages, ...originalImages];

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
            onClick={clearAll}
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

      {/* Generated Images Section */}
      {generatedImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-secondary)]">
            {t("generatePage.imageAnalysis.generatedAlternatives")}
          </p>
          <ImageGrid
            images={generatedImages}
            isSelected={isSelected}
            onToggle={toggleImage}
            onPreview={(index) => handlePreview(getFullIndex(generatedImages, index, true))}
            onRegenerate={channelId && onImageRegenerated ? handleRegenerate : undefined}
            regeneratingUrl={regeneratingUrl}
            cleaningUrl={cleaningUrl}
          />
        </div>
      )}

      {/* Original Images Section */}
      {originalImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-secondary)]">
            {t("generatePage.imageAnalysis.originalImages")}
          </p>
          <ImageGrid
            images={originalImages}
            isSelected={isSelected}
            onToggle={toggleImage}
            onPreview={(index) => handlePreview(getFullIndex(originalImages, index, false))}
            onRegenerate={channelId && onImageRegenerated ? handleRegenerate : undefined}
            onClean={channelId && onImageRegenerated ? handleClean : undefined}
            regeneratingUrl={regeneratingUrl}
            cleaningUrl={cleaningUrl}
          />
        </div>
      )}

      {/* Preview Modal */}
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

interface ImageGridProps {
  images: PostImage[];
  isSelected: (url: string) => boolean;
  onToggle: (image: PostImage) => void;
  onPreview: (index: number) => void;
  onRegenerate?: (image: PostImage) => void;
  onClean?: (image: PostImage) => void;
  regeneratingUrl: string | null;
  cleaningUrl: string | null;
}

function ImageGrid({
  images,
  isSelected,
  onToggle,
  onPreview,
  onRegenerate,
  onClean,
  regeneratingUrl,
  cleaningUrl,
}: ImageGridProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-4 gap-2">
      {images.map((image, index) => {
        const selected = isSelected(image.url);
        const isRegenerating = regeneratingUrl === image.url;
        const isCleaning = cleaningUrl === image.url;
        const isProcessing = isRegenerating || isCleaning;

        return (
          <div key={index} className="relative group">
            <button
              type="button"
              onClick={() => onToggle(image)}
              disabled={isProcessing}
              className={`relative aspect-square rounded-[var(--radius-sm)] overflow-hidden border-2 transition-all w-full ${
                selected
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
              {selected && (
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
                  onPreview(index);
                }}
                className="p-1 rounded bg-black/60 text-white hover:bg-black/80 transition-colors"
                title={t("generatePage.imageActions.preview")}
              >
                <Expand className="h-3 w-3" />
              </button>

              {/* Clean button - removes watermarks/links */}
              {onClean && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClean(image);
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
                    onRegenerate(image);
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
      })}
    </div>
  );
}
