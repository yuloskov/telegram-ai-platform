import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { useI18n } from "~/i18n";
import { useGenerationStore } from "~/stores/generation-store";
import { SourceItem } from "./source-item";
import { Button } from "~/components/ui/button";

interface ScrapedPost {
  id: string;
  text: string | null;
  views: number;
  mediaUrls: string[];
}

interface Source {
  id: string;
  sourceType: "telegram" | "document" | "webpage";
  telegramUsername: string | null;
  documentName: string | null;
  webpageTitle: string | null;
  webpageDomain: string | null;
  isActive: boolean;
  scrapedContent: ScrapedPost[];
}

interface SourceSelectionPanelProps {
  sources: Source[];
  isLoading: boolean;
  channelId: string;
}

export function SourceSelectionPanel({ sources, isLoading, channelId }: SourceSelectionPanelProps) {
  const { t } = useI18n();
  const {
    sourceSelections,
    toggleSource,
    setPostCount,
    togglePost,
    selectRandomPosts,
  } = useGenerationStore();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] h-20"
          />
        ))}
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-secondary)] bg-[var(--bg-primary)] p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
          <Newspaper className="h-6 w-6 text-[var(--text-tertiary)]" />
        </div>
        <h3 className="text-base font-medium text-[var(--text-primary)] mb-2">
          {t("generatePage.noSources")}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {t("generatePage.noSourcesDescription")}
        </p>
        <Button asChild>
          <Link href={`/channels/${channelId}/sources`}>
            <Plus className="h-4 w-4" />
            {t("sources.addSource")}
          </Link>
        </Button>
      </div>
    );
  }

  const hasNoScrapedContent = sources.every((s) => s.scrapedContent.length === 0);

  if (hasNoScrapedContent) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-secondary)] bg-[var(--bg-primary)] p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
          <Newspaper className="h-6 w-6 text-[var(--text-tertiary)]" />
        </div>
        <h3 className="text-base font-medium text-[var(--text-primary)] mb-2">
          {t("generatePage.noScrapedContent")}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {t("generatePage.noScrapedContentDescription")}
        </p>
        <Button asChild>
          <Link href={`/channels/${channelId}/sources`}>
            {t("generatePage.goToSources")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          {t("generatePage.selectSources")}
        </h3>
      </div>

      <div className="space-y-3">
        {sources.map((source) => {
          const selection = sourceSelections.get(source.id);

          return (
            <SourceItem
              key={source.id}
              id={source.id}
              channelId={channelId}
              sourceType={source.sourceType}
              telegramUsername={source.telegramUsername}
              documentName={source.documentName}
              webpageTitle={source.webpageTitle}
              webpageDomain={source.webpageDomain}
              isActive={source.isActive}
              scrapedContent={source.scrapedContent}
              enabled={selection?.enabled ?? false}
              postCount={selection?.postCount ?? 5}
              selectedPostIds={selection?.selectedPostIds ?? new Set()}
              onToggleSource={() => toggleSource(source.id)}
              onSetPostCount={(count) => setPostCount(source.id, count)}
              onTogglePost={(postId) => togglePost(source.id, postId)}
              onSelectRandom={(postIds, count) => selectRandomPosts(source.id, postIds, count)}
            />
          );
        })}
      </div>
    </div>
  );
}
