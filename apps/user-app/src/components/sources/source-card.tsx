import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Trash2, ChevronRight, FileText, Globe, Loader2, AlertCircle } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { useScrapeStatus } from "~/hooks/useScrapeStatus";
import { useI18n } from "~/i18n";

interface ContentSource {
  id: string;
  sourceType: "telegram" | "document" | "webpage";
  telegramUsername: string | null;
  documentName: string | null;
  documentSize: number | null;
  webpageUrl: string | null;
  webpageTitle: string | null;
  webpageDomain: string | null;
  webpageError: string | null;
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
  const isWebpage = source.sourceType === "webpage";
  const isProcessing = (isDocument || isWebpage) && !source.lastScrapedAt;
  const hasError = isWebpage && source.webpageError;

  // Track scrape job status from server (only for telegram sources)
  const { isRunning, latestLog } = useScrapeStatus(
    channelId,
    isDocument || isWebpage ? "" : source.id
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

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources/${source.id}/refresh`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", channelId] });
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
          {isWebpage ? (
            <>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[var(--text-tertiary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {source.webpageTitle || source.webpageDomain || t("sources.webpage")}
                </span>
                {isProcessing && !hasError && (
                  <span className="text-xs px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-full flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("sources.processing")}
                  </span>
                )}
                {hasError && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {t("sources.fetchError")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-[var(--text-tertiary)]">
                  {source._count.scrapedContent} {t("sources.chunks")}
                </span>
                {source.webpageDomain && (
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {source.webpageDomain}
                  </span>
                )}
              </div>
            </>
          ) : isDocument ? (
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
          {isWebpage && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                refreshMutation.mutate();
              }}
              disabled={refreshMutation.isPending || isProcessing}
            >
              {refreshMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {t("sources.refreshing")}
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("sources.refreshWebpage")}
                </>
              )}
            </Button>
          )}
          {!isDocument && !isWebpage && (
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
