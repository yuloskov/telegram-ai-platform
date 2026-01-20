import { Image } from "lucide-react";
import { useI18n } from "~/i18n";
import type { ImageStrategy } from "~/stores/generation-store";

interface ImageStrategyBadgeProps {
  strategy: ImageStrategy;
  imageCount?: number;
}

export function ImageStrategyBadge({ strategy, imageCount = 0 }: ImageStrategyBadgeProps) {
  const { t } = useI18n();

  // Only show badge if there are actual images
  if (imageCount === 0) {
    return null;
  }

  // Show original images badge (regardless of AI's recommendation)
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--accent-secondary)]">
      <Image className="h-3 w-3" />
      {t("generatePage.originalImages", { count: imageCount })}
    </span>
  );
}
