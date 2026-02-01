import { useState } from "react";
import { ChevronDown, ChevronRight, Shuffle, FileText, Globe } from "lucide-react";
import { cn } from "~/lib/utils";
import { useI18n } from "~/i18n";
import { Button } from "~/components/ui/button";
import { SourcePostSelector } from "./source-post-selector";

interface ScrapedPost {
  id: string;
  text: string | null;
  views: number;
  mediaUrls: string[];
}

interface SourceItemProps {
  id: string;
  channelId: string;
  sourceType: "telegram" | "document" | "webpage";
  telegramUsername: string | null;
  documentName: string | null;
  webpageTitle: string | null;
  webpageDomain: string | null;
  isActive: boolean;
  scrapedContent: ScrapedPost[];
  enabled: boolean;
  postCount: number;
  selectedPostIds: Set<string>;
  onToggleSource: () => void;
  onSetPostCount: (count: number) => void;
  onTogglePost: (postId: string) => void;
  onSelectRandom: (postIds: string[], count: number) => void;
}

export function SourceItem({
  id,
  channelId,
  sourceType,
  telegramUsername,
  documentName,
  webpageTitle,
  webpageDomain,
  scrapedContent,
  enabled,
  selectedPostIds,
  onToggleSource,
  onTogglePost,
  onSelectRandom,
}: SourceItemProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedCount = selectedPostIds.size;
  const hasContent = scrapedContent.length > 0;

  // Get display title based on source type
  const getSourceTitle = () => {
    switch (sourceType) {
      case "telegram":
        return `@${telegramUsername || ""}`;
      case "document":
        return documentName || t("sources.untitledDocument");
      case "webpage":
        return webpageTitle || webpageDomain || t("sources.untitledWebpage");
      default:
        return t("sources.unknownSource");
    }
  };

  // Get icon based on source type
  const SourceIcon = () => {
    switch (sourceType) {
      case "document":
        return <FileText className="h-4 w-4 text-[var(--text-tertiary)]" />;
      case "webpage":
        return <Globe className="h-4 w-4 text-[var(--text-tertiary)]" />;
      default:
        return null;
    }
  };

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
          <div className="flex items-center gap-2">
            <SourceIcon />
            <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">
              {getSourceTitle()}
            </h4>
          </div>
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
          <div className="flex items-center justify-between px-3 pt-2">
            <span className="text-xs text-[var(--text-tertiary)]">
              {t("generatePage.postsSelected", { selected: selectedCount, total: scrapedContent.length })}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const postIds = scrapedContent.map((p) => p.id);
                onSelectRandom(postIds, 5);
              }}
            >
              <Shuffle className="h-3 w-3 mr-1" />
              {t("sources.selectRandom", { count: 5 })}
            </Button>
          </div>
          <SourcePostSelector
            posts={scrapedContent}
            selectedIds={selectedPostIds}
            onToggle={onTogglePost}
            channelId={channelId}
            sourceId={id}
          />
        </div>
      )}
    </div>
  );
}
