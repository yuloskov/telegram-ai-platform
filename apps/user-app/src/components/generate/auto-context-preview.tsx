import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { TelegramHtml } from "~/components/telegram/telegram-html";
import { useI18n } from "~/i18n";

interface RecentPost {
  id: string;
  content: string;
  publishedAt: string;
}

interface AutoContextPreviewProps {
  posts: RecentPost[];
  isLoading: boolean;
}

export function AutoContextPreview({ posts, isLoading }: AutoContextPreviewProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] h-16" />
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-secondary)] bg-[var(--bg-primary)]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--accent-primary-subtle)] flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-[var(--accent-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            {t("generatePage.channelContext")}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {posts.length > 0
              ? t("generatePage.channelContextCount", { count: posts.length })
              : t("generatePage.channelContextEmpty")}
          </p>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-[var(--text-tertiary)]" />
        ) : (
          <ChevronRight className="h-5 w-5 text-[var(--text-tertiary)]" />
        )}
      </button>

      {isExpanded && posts.length > 0 && (
        <div className="border-t border-[var(--border-secondary)] p-4 space-y-3 max-h-[300px] overflow-y-auto">
          {posts.map((post) => (
            <div
              key={post.id}
              className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]"
            >
              <div className="line-clamp-3">
                <TelegramHtml content={post.content} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
