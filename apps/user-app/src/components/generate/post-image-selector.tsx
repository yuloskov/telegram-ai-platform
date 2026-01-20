import { Check, Image, X } from "lucide-react";
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

interface PostImageSelectorProps {
  selectedImages: PostImage[];
  onImagesChange: (images: PostImage[]) => void;
  sources: SourceContent[];
}

export function PostImageSelector({
  selectedImages,
  onImagesChange,
  sources,
}: PostImageSelectorProps) {
  const { t } = useI18n();

  // Get all available images from sources
  const availableImages = sources.flatMap((source) =>
    source.media
      .filter((m) => m.type.startsWith("image"))
      .map((m) => ({
        url: m.url,
        sourceId: source.id,
        isGenerated: false,
      }))
  );

  const isSelected = (url: string) => selectedImages.some((img) => img.url === url);

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

  if (availableImages.length === 0) {
    return null;
  }

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

      <div className="space-y-2">
        <p className="text-xs text-[var(--text-secondary)]">
          {t("generatePage.availableFromSources")}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {availableImages.map((image, index) => {
            const selected = isSelected(image.url);
            return (
              <button
                key={index}
                type="button"
                onClick={() => toggleImage(image)}
                className={`relative aspect-square rounded-[var(--radius-sm)] overflow-hidden border-2 transition-all ${
                  selected
                    ? "border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20"
                    : "border-transparent hover:border-[var(--border-primary)]"
                }`}
              >
                <img
                  src={image.url}
                  alt={`Available image ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {selected && (
                  <div className="absolute inset-0 bg-[var(--accent-primary)]/20 flex items-center justify-center">
                    <div className="bg-[var(--accent-primary)] rounded-full p-1">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
