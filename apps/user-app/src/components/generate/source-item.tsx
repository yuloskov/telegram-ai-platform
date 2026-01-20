import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { useI18n } from "~/i18n";
import { SourcePostSelector } from "./source-post-selector";

interface MediaFile {
  type: string;
  url: string;
}

interface ScrapedPost {
  id: string;
  text: string | null;
  views: number;
  forwards: number;
  reactions: number;
  usedForGeneration: boolean;
  mediaFiles: MediaFile[];
}

interface SourceItemProps {
  id: string;
  telegramUsername: string;
  isActive: boolean;
  scrapedContent: ScrapedPost[];
  enabled: boolean;
  postCount: number;
  selectedPostIds: Set<string>;
  onToggleSource: () => void;
  onSetPostCount: (count: number) => void;
  onTogglePost: (postId: string) => void;
}

export function SourceItem({
  telegramUsername,
  scrapedContent,
  enabled,
  selectedPostIds,
  onToggleSource,
  onTogglePost,
}: SourceItemProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedCount = selectedPostIds.size;
  const hasContent = scrapedContent.length > 0;

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border transition-colors",
        enabled
          ? "border-[var(--border-primary)] bg-[var(--bg-primary)]"
          : "border-[var(--border-secondary)] bg-[var(--bg-secondary)] opacity-60"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 p-4",
          hasContent && "cursor-pointer"
        )}
        onClick={() => hasContent && setIsExpanded(!isExpanded)}
      >
        {/* Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSource();
          }}
          disabled={!hasContent}
          className={cn(
            "shrink-0 w-10 h-6 rounded-full transition-colors relative",
            enabled ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-tertiary)]",
            !hasContent && "opacity-50 cursor-not-allowed"
          )}
        >
          <span
            className={cn(
              "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
              enabled ? "left-5" : "left-1"
            )}
          />
        </button>

        {/* Source info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[var(--text-primary)]">
            @{telegramUsername}
          </h4>
          <p className="text-xs text-[var(--text-secondary)]">
            {hasContent
              ? t("generatePage.postsSelected", { selected: selectedCount, total: scrapedContent.length })
              : t("generatePage.noPostsAvailable")}
          </p>
        </div>

        {/* Expand indicator */}
        {hasContent && (
          <div className="p-2">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronRight className="h-5 w-5 text-[var(--text-tertiary)]" />
            )}
          </div>
        )}
      </div>

      {/* Expanded post selector */}
      {isExpanded && hasContent && (
        <div className="border-t border-[var(--border-secondary)]">
          <SourcePostSelector
            posts={scrapedContent}
            selectedIds={selectedPostIds}
            onToggle={onTogglePost}
          />
        </div>
      )}
    </div>
  );
}
