import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Trash2, ExternalLink, Lightbulb } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { ConfirmModal } from "~/components/ui/confirm-modal";
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<string | null>(null);

  const handleDeleteClick = (sourceId: string) => {
    setSourceToDelete(sourceId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (sourceToDelete) {
      onDelete(sourceToDelete);
      setDeleteConfirmOpen(false);
      setSourceToDelete(null);
    }
  };

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
          icon={<Lightbulb className="h-8 w-8 text-[var(--text-tertiary)]" />}
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
    <div className="space-y-3">
      {sources.map((source) => {
        const isScraping = scrapingSourceId === source.id;
        return (
          <Card key={source.id} interactive className="p-4">
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
                      <RefreshCw className="h-3.5 w-3.5" />
                      {t("sources.scrapeNow")}
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteClick(source.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}

      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t("sources.deleteConfirmTitle")}
        description={t("sources.deleteConfirmDescription")}
        confirmLabel={t("common.delete")}
        onConfirm={handleConfirmDelete}
        variant="danger"
      />
    </div>
  );
}
