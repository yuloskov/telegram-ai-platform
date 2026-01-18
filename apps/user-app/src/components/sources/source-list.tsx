import Link from "next/link";
import { Download, Trash2, ExternalLink } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { EmptyState } from "~/components/telegram/empty-state";
import { useI18n } from "~/i18n";

interface ContentSource {
  id: string;
  telegramUsername: string;
  isActive: boolean;
  lastScrapedAt: string | null;
  _count: {
    scrapedContent: number;
  };
}

interface SourceListProps {
  sources: ContentSource[];
  channelId: string;
  isLoading: boolean;
  scrapingSourceId: string | null;
  onTriggerScrape: (sourceId: string) => void;
  onDelete: (sourceId: string) => void;
  onOpenAddModal: () => void;
}

export function SourceList({
  sources,
  channelId,
  isLoading,
  scrapingSourceId,
  onTriggerScrape,
  onDelete,
  onOpenAddModal,
}: SourceListProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <Card>
        <div className="p-8 flex items-center justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  if (sources.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Download className="h-8 w-8 text-[var(--text-tertiary)]" />}
          title={t("sources.noSources")}
          description={t("sources.noSourcesDescription")}
          action={
            <Button onClick={onOpenAddModal}>
              {t("sources.addSource")}
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="divide-y divide-[var(--border-secondary)]">
        {sources.map((source) => {
          const isScraping = scrapingSourceId === source.id;
          return (
            <div
              key={source.id}
              className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/channels/${channelId}/sources/${source.id}`}
                    className="text-sm font-medium text-[var(--text-primary)] hover:underline flex items-center gap-1"
                  >
                    @{source.telegramUsername}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {source._count.scrapedContent} {t("sources.posts")}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {source.lastScrapedAt
                        ? `${t("sources.lastScraped")}: ${new Date(source.lastScrapedAt).toLocaleDateString()}`
                        : t("sources.neverScraped")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onTriggerScrape(source.id)}
                    disabled={isScraping}
                  >
                    {isScraping ? (
                      <>
                        <Spinner size="sm" />
                        {t("sources.scraping")}
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        {t("sources.scrapeNow")}
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(t("sources.deleteConfirm"))) {
                        onDelete(source.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
