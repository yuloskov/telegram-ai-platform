// Image grid component - extracted from post-image-selector.tsx

import type { PostImage } from "~/types";
import { ImageGridItem } from "./image-grid-item";

export interface ImageGridProps {
  images: PostImage[];
  selectedUrls: Set<string>;
  regeneratingUrl: string | null;
  cleaningUrl: string | null;
  onToggle: (image: PostImage) => void;
  onPreview: (index: number) => void;
  onRegenerate?: (image: PostImage) => void;
  onClean?: (image: PostImage) => void;
}

export function ImageGrid({
  images,
  selectedUrls,
  regeneratingUrl,
  cleaningUrl,
  onToggle,
  onPreview,
  onRegenerate,
  onClean,
}: ImageGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {images.map((image, index) => (
        <ImageGridItem
          key={index}
          image={image}
          index={index}
          isSelected={selectedUrls.has(image.url)}
          isRegenerating={regeneratingUrl === image.url}
          isCleaning={cleaningUrl === image.url}
          onToggle={() => onToggle(image)}
          onPreview={() => onPreview(index)}
          onRegenerate={onRegenerate ? () => onRegenerate(image) : undefined}
          onClean={onClean ? () => onClean(image) : undefined}
        />
      ))}
    </div>
  );
}
