import type { ReactNode } from "react";
import { Images } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Badge, type BadgeVariant } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { TelegramHtml } from "~/components/telegram/telegram-html";
import { useI18n } from "~/i18n";
import { getMediaSrc, isVideoOnly } from "~/lib/media";

export interface ChipProps {
  label: string;
  icon?: ReactNode;
  variant?: BadgeVariant;
}

interface ContentListItemProps {
  id: string;
  text: string | null;
  thumbnailUrl?: string | null;
  imageCount?: number;
  chips?: ChipProps[];
  metrics?: ReactNode;
  date: string;
  selected?: boolean;
  selectionEnabled?: boolean;
  onSelect?: (id: string) => void;
  onClick?: (id: string) => void;
  mediaUrls?: string[];
}

export function ContentListItem({
  id,
  text,
  thumbnailUrl,
  imageCount = 0,
  chips = [],
  metrics,
  date,
  selected = false,
  selectionEnabled = false,
  onSelect,
  onClick,
  mediaUrls = [],
}: ContentListItemProps) {
  const { t } = useI18n();

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox area
    if ((e.target as HTMLElement).closest("[data-checkbox]")) {
      return;
    }
    onClick?.(id);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(id);
  };

  const validThumbnail =
    thumbnailUrl &&
    !thumbnailUrl.startsWith("skipped:") &&
    !thumbnailUrl.startsWith("failed:");

  return (
    <Card
      interactive
      className="p-4 cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        {selectionEnabled && (
          <div
            data-checkbox
            className="shrink-0 pt-0.5"
            onClick={handleCheckboxClick}
          >
            <Checkbox checked={selected} />
          </div>
        )}

        {/* Image Thumbnail */}
        {validThumbnail && (
          <div className="relative shrink-0 w-16 h-16 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] overflow-hidden">
            <img
              src={getMediaSrc(thumbnailUrl)}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            {/* Multiple images indicator */}
            {imageCount > 1 && (
              <div className="absolute bottom-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/60 rounded text-white text-[10px] font-medium">
                <Images className="h-3 w-3" />
                {imageCount}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm text-[var(--text-primary)] line-clamp-3">
              {text ? (
                <TelegramHtml content={text} />
              ) : (
                <span className="italic text-[var(--text-tertiary)]">
                  {isVideoOnly(text, mediaUrls)
                    ? t("sources.videoOnly")
                    : t("sources.mediaOnly")}
                </span>
              )}
            </div>
            {chips.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                {chips.map((chip, idx) => (
                  <Badge key={idx} variant={chip.variant} icon={chip.icon}>
                    {chip.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            {metrics || <div />}
            <span className="text-xs text-[var(--text-tertiary)]">
              {new Date(date).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
