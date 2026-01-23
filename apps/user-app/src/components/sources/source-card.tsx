import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Trash2, ChevronRight, FileText, Loader2 } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { useScrapeStatus } from "~/hooks/useScrapeStatus";
import { useI18n } from "~/i18n";

interface ContentSource {
  id: string;
  sourceType: "telegram" | "document";
  telegramUsername: string | null;
  documentName: string | null;
  documentSize: number | null;
  isActive: boolean;
  lastScrapedAt: string | null;
  _count: {
    scrapedContent: number;
  };
}

interface SourceCardProps {
  source: ContentSource;
  channelId: string;
  onDelete: (sourceId: string) => void;
}

export function SourceCard({ source, channelId, onDelete }: SourceCardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isDocument = source.sourceType === "document";
  const isProcessing = isDocument && !source.lastScrapedAt;

  // Track scrape job status from server (only for telegram sources)
  const { isRunning, latestLog } = useScrapeStatus(
    channelId,
    isDocument ? "" : source.id
  );
  const [prevIsRunning, setPrevIsRunning] = useState(false);

  // Refresh data when scrape job completes
  useEffect(() => {
    if (prevIsRunning && !isRunning) {
      queryClient.invalidateQueries({ queryKey: ["sources", channelId] });
    }
    setPrevIsRunning(isRunning);
  }, [isRunning, prevIsRunning, queryClient, channelId]);

  // Poll for document processing completion
  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["sources", channelId] });
    }, 3000);

    return () => clearInterval(interval);
  }, [isProcessing, queryClient, channelId]);

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources/${source.id}/scrape`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrape-status", channelId, source.id] });
    },
  });

  const handleCardClick = () => {
    router.push(`/channels/${channelId}/sources/${source.id}`);
  };

  const isScraping = isRunning || scrapeMutation.isPending;

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card
      interactive
      className="p-4 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {isDocument ? (
            <>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--text-tertiary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {source.documentName || t("sources.document")}
                </span>
                {isProcessing && (
                  <span className="text-xs px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-full flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("sources.processing")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-[var(--text-tertiary)]">
                  {source._count.scrapedContent} {t("sources.chunks")}
                </span>
                {source.documentSize && (
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {formatFileSize(source.documentSize)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                @{source.telegramUsername}
              </span>
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
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isDocument && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                scrapeMutation.mutate();
              }}
              disabled={isScraping}
            >
              {isScraping ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {t("sources.scraping")}
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("sources.scrapeNow")}
                </>
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(source.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
        </div>
      </div>
    </Card>
  );
}
