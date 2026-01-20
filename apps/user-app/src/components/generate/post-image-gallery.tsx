import type { PostImage } from "~/stores/generation-store";

interface PostImageGalleryProps {
  images: PostImage[];
  maxDisplay?: number;
}

export function PostImageGallery({ images, maxDisplay = 4 }: PostImageGalleryProps) {
  if (images.length === 0) {
    return null;
  }

  const displayImages = images.slice(0, maxDisplay);
  const remainingCount = images.length - maxDisplay;

  const gridCols = displayImages.length === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className={`grid ${gridCols} gap-1 mb-3`}>
      {displayImages.map((image, index) => (
        <div
          key={index}
          className="relative aspect-video bg-[var(--bg-tertiary)] rounded-[var(--radius-sm)] overflow-hidden"
        >
          <img
            src={image.url}
            alt={`Post image ${index + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {index === maxDisplay - 1 && remainingCount > 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-lg font-medium">+{remainingCount}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
