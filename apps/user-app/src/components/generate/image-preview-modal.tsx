import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { PostImage } from "~/stores/generation-store";
import { ImageAnalysisBadge } from "./image-analysis-badge";

interface ImagePreviewModalProps {
  images: PostImage[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImagePreviewModal({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: ImagePreviewModalProps) {
  const currentImage = images[currentIndex];

  const handlePrev = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    onNavigate(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    onNavigate(newIndex);
  };

  // Handle keyboard navigation - capture phase to prevent parent modal from closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    // Use capture phase to intercept before Radix Dialog
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [currentIndex, images.length, onClose]);

  if (!currentImage) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop, not on children
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      e.preventDefault();
      onClose();
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose();
  };

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
      style={{ pointerEvents: 'auto' }}
      onMouseDown={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onMouseDown={(e) => {
          e.stopPropagation();
          handleCloseClick(e);
        }}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation - Previous */}
      {images.length > 1 && (
        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image container */}
      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.url}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />

        {/* Badge */}
        <ImageAnalysisBadge
          analysisResult={currentImage.analysisResult}
          isGenerated={currentImage.isGenerated}
          className="!top-3 !left-3 !text-xs !px-2 !py-1"
        />

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Navigation - Next */}
      {images.length > 1 && (
        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );

  // Use portal to render over everything
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(content, document.body);
}
