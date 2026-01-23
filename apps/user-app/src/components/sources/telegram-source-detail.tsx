import { useState } from "react";
import { PageHeader } from "~/components/layout/header";
import { PageSection } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { ConfirmModal } from "~/components/ui/confirm-modal";
import { ScrapedContentList } from "~/components/sources/scraped-content-list";
import { ContentFilters } from "~/components/sources/content-filters";
import { GenerationActionBar } from "~/components/sources/generation-action-bar";
import { GenerateFromScrapedModal } from "~/components/sources/generate-from-scraped-modal";
import { AutoScrapeSettings } from "~/components/sources/auto-scrape-settings";
import { ScrapingHistory } from "~/components/sources/scraping-history";
import { SourceStatsCard } from "~/components/sources/source-stats-card";
import { SourceActions } from "~/components/sources/source-actions";
import { useI18n } from "~/i18n";
import type { useSourceDetail } from "~/hooks/useSourceDetail";

interface Channel {
  id: string;
  title: string;
}

interface TelegramSourceDetailProps {
  channel: Channel;
  channelId: string;
  sourceId: string;
  sourceDetail: ReturnType<typeof useSourceDetail>;
}

export function TelegramSourceDetail({
  channel,
  channelId,
  sourceId,
  sourceDetail,
}: TelegramSourceDetailProps) {
  const { t } = useI18n();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

  const {
    source,
    content,
    pagination,
    contentLoading,
    isScraping,
    page,
    setPage,
    search,
    sortBy,
    dateRange,
    handleSearchChange,
    handleSortByChange,
    handleDateRangeChange,
    scrapeMutation,
    deleteMutation,
  } = sourceDetail;

  if (!source) return null;

  return (
    <>
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
            <SourceActions
              isScraping={isScraping || scrapeMutation.isPending}
              onScrape={() => scrapeMutation.mutate()}
              onDelete={() => setDeleteConfirmOpen(true)}
            />
          }
        />

        <SourceStatsCard
          scrapedCount={source._count.scrapedContent}
          lastScrapedAt={source.lastScrapedAt}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <AutoScrapeSettings channelId={channelId} sourceId={sourceId} />
          <ScrapingHistory channelId={channelId} sourceId={sourceId} />
        </div>

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
            channelId={channelId}
            sourceId={sourceId}
          />

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
        channelId={channelId}
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
    </>
  );
}
