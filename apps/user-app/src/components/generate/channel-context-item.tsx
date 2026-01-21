import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "~/lib/utils";
import { useI18n } from "~/i18n";
import { SourcePostSelector } from "./source-post-selector";

interface ChannelPost {
  id: string;
  content: string;
  publishedAt: string;
  mediaUrls: string[];
}

interface ChannelContextItemProps {
  posts: ChannelPost[];
  enabled: boolean;
  selectedPostIds: Set<string>;
  onToggle: () => void;
  onTogglePost: (postId: string) => void;
  isLoading?: boolean;
}

export function ChannelContextItem({
  posts,
  enabled,
  selectedPostIds,
  onToggle,
  onTogglePost,
  isLoading,
}: ChannelContextItemProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedCount = selectedPostIds.size;
  const hasContent = posts.length > 0;

  // Transform channel posts to source post format for reusing SourcePostSelector
  const transformedPosts = posts.map((post) => ({
    id: post.id,
    text: post.content,
    views: 0, // Channel posts don't have views
    mediaUrls: post.mediaUrls,
  }));

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] h-16" />
    );
  }

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
            onToggle();
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

        {/* Icon */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--accent-primary-subtle)] flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-[var(--accent-primary)]" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[var(--text-primary)]">
            {t("generatePage.channelContext")}
          </h4>
          <p className="text-xs text-[var(--text-secondary)]">
            {hasContent
              ? t("generatePage.postsSelected", { selected: selectedCount, total: posts.length })
              : t("generatePage.channelContextEmpty")}
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
            posts={transformedPosts}
            selectedIds={selectedPostIds}
            onToggle={onTogglePost}
          />
        </div>
      )}
    </div>
  );
}
