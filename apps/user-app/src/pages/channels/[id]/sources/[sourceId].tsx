import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { useScrapeStatus } from "~/hooks/useScrapeStatus";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Card } from "~/components/ui/card";
import { ConfirmModal } from "~/components/ui/confirm-modal";
import { ScrapedContentList } from "~/components/sources/scraped-content-list";
import { ContentFilters, type SortBy, type DateRange } from "~/components/sources/content-filters";
import { GenerationActionBar } from "~/components/sources/generation-action-bar";
import { GenerateFromScrapedModal } from "~/components/sources/generate-from-scraped-modal";
import { AutoScrapeSettings } from "~/components/sources/auto-scrape-settings";
import { ScrapingHistory } from "~/components/sources/scraping-history";
import { RefreshCw, Trash2 } from "lucide-react";
import { useI18n } from "~/i18n";

interface Channel {
  id: string;
  title: string;
}

interface ContentSource {
  id: string;
  telegramUsername: string;
  isActive: boolean;
  lastScrapedAt: string | null;
  _count: {
    scrapedContent: number;
  };
}

interface ScrapedContent {
  id: string;
  telegramMessageId: string;
  text: string | null;
  mediaUrls: string[];
  views: number;
  forwards: number;
  reactions: number;
  scrapedAt: string;
  usedForGeneration: boolean;
}

interface ContentResponse {
  data: ScrapedContent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function SourceDetailPage() {
  const router = useRouter();
  const { id: channelId, sourceId } = router.query;
  const queryClient = useQueryClient();
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [page, setPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  // Generation modal state
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

  // Track scrape job status
  const { isRunning: isScraping, latestLog } = useScrapeStatus(
    channelId as string,
    sourceId as string
  );
  const [prevIsRunning, setPrevIsRunning] = useState(false);

  // Refresh data when scrape job completes
  useEffect(() => {
    if (prevIsRunning && !isScraping) {
      // Job just completed, refresh data
      queryClient.invalidateQueries({ queryKey: ["scrape-logs", channelId, sourceId] });
      queryClient.invalidateQueries({ queryKey: ["source-content", channelId, sourceId] });
      queryClient.invalidateQueries({ queryKey: ["source", channelId, sourceId] });
    }
    setPrevIsRunning(isScraping);
  }, [isScraping, prevIsRunning, queryClient, channelId, sourceId]);

  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["channel", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${channelId}`);
      const json = await res.json();
      return json.data as Channel;
    },
    enabled: !!channelId && !authLoading,
  });

  const { data: source, isLoading: sourceLoading } = useQuery({
    queryKey: ["source", channelId, sourceId],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}`);
      const json = await res.json();
      return json.data as ContentSource;
    },
    enabled: !!channelId && !!sourceId && !authLoading,
  });

  const { data: contentData, isLoading: contentLoading } = useQuery({
    queryKey: ["source-content", channelId, sourceId, page, search, sortBy, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sortBy,
        ...(search && { search }),
        ...(dateRange !== "all" && { dateRange }),
      });
      const res = await fetch(
        `/api/channels/${channelId}/sources/${sourceId}/content?${params.toString()}`
      );
      const json = await res.json();
      return json as ContentResponse;
    },
    enabled: !!channelId && !!sourceId && !authLoading,
  });

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSortByChange = (value: SortBy) => {
    setSortBy(value);
    setPage(1);
  };

  const handleDateRangeChange = (value: DateRange) => {
    setDateRange(value);
    setPage(1);
  };

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}/scrape`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      // Invalidate scrape status to start polling
      queryClient.invalidateQueries({ queryKey: ["scrape-status", channelId, sourceId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", channelId] });
      router.push(`/channels/${channelId}/sources`);
    },
  });

  if (authLoading || channelLoading || sourceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!channel || !source) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <p className="text-[var(--text-secondary)]">{t("channels.notFound")}</p>
      </div>
    );
  }

  const content = contentData?.data ?? [];
  const pagination = contentData?.pagination;

  return (
    <PageLayout title={`@${source.telegramUsername} - ${channel.title}`}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        <PageHeader
          title={`@${source.telegramUsername}`}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title, href: `/channels/${channelId}` },
            { label: t("sources.title"), href: `/channels/${channelId}/sources` },
            { label: `@${source.telegramUsername}` },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => scrapeMutation.mutate()}
                disabled={isScraping || scrapeMutation.isPending}
              >
                {isScraping || scrapeMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t("sources.scraping")}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    {t("sources.scrapeNow")}
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                {t("sources.deleteSource")}
              </Button>
            </div>
          }
        />

        {/* Source Stats */}
        <Card className="mb-6">
          <div className="p-4 flex items-center gap-6">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">{t("sources.posts")}</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {source._count.scrapedContent}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">{t("sources.lastScraped")}</p>
              <p className="text-sm text-[var(--text-primary)]">
                {source.lastScrapedAt
                  ? new Date(source.lastScrapedAt).toLocaleString()
                  : t("sources.neverScraped")}
              </p>
            </div>
          </div>
        </Card>

        {/* Auto-scrape Settings and History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <AutoScrapeSettings
            channelId={channelId as string}
            sourceId={sourceId as string}
          />
          <ScrapingHistory
            channelId={channelId as string}
            sourceId={sourceId as string}
          />
        </div>

        {/* Scraped Content */}
        <PageSection title={t("sources.scrapedContent")}>
          <ContentFilters
            search={search}
            onSearchChange={handleSearchChange}
            sortBy={sortBy}
            onSortByChange={handleSortByChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
          <ScrapedContentList
            content={content}
            isLoading={contentLoading}
            channelId={channelId as string}
            sourceId={sourceId as string}
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t("common.back")}
              </Button>
              <span className="text-sm text-[var(--text-secondary)]">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                {t("common.next")}
              </Button>
            </div>
          )}
        </PageSection>
      </div>

      <GenerationActionBar onGenerate={() => setGenerateModalOpen(true)} />

      <GenerateFromScrapedModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        channelId={channelId as string}
      />

      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t("sources.deleteConfirmTitle")}
        description={t("sources.deleteConfirmDescription")}
        confirmLabel={t("common.delete")}
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </PageLayout>
  );
}
