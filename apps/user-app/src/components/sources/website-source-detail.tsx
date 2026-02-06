import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "~/components/layout/header";
import { PageSection } from "~/components/layout/page-layout";
import { Card } from "~/components/ui/card";
import { Badge, type BadgeVariant } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ConfirmModal } from "~/components/ui/confirm-modal";
import { WebsitePagesList } from "~/components/sources/website-pages-list";
import { useI18n } from "~/i18n";
import type { useSourceDetail } from "~/hooks/useSourceDetail";

interface Channel {
  id: string;
  title: string;
}

interface WebsiteSourceDetailProps {
  channel: Channel;
  channelId: string;
  sourceId: string;
  sourceDetail: ReturnType<typeof useSourceDetail>;
}

export function WebsiteSourceDetail({
  channel,
  channelId,
  sourceId,
  sourceDetail,
}: WebsiteSourceDetailProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { source, deleteMutation } = sourceDetail;

  const refreshMutation = useMutation({
    mutationFn: async (fullRecrawl: boolean) => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullRecrawl }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source", channelId, sourceId] });
      queryClient.invalidateQueries({ queryKey: ["website-pages", channelId, sourceId] });
    },
  });

  // Poll while crawling
  const isCrawling = source && ["discovering", "scoring", "scraping"].includes(source.websiteCrawlStatus ?? "");
  useEffect(() => {
    if (!isCrawling) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["source", channelId, sourceId] });
      queryClient.invalidateQueries({ queryKey: ["website-pages", channelId, sourceId] });
    }, 3000);
    return () => clearInterval(interval);
  }, [isCrawling, queryClient, channelId, sourceId]);

  if (!source) return null;

  const crawlStatus = source.websiteCrawlStatus ?? "idle";
  const title = source.websiteTitle || source.websiteDomain || t("sources.website");

  return (
    <>
      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        <PageHeader
          title={title}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title, href: `/channels/${channelId}` },
            { label: t("sources.title"), href: `/channels/${channelId}/sources` },
            { label: title },
          ]}
          actions={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => refreshMutation.mutate(false)}
                disabled={refreshMutation.isPending || !!isCrawling}
              >
                {refreshMutation.isPending || isCrawling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("sources.reCrawling")}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    {t("sources.reCrawl")}
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => refreshMutation.mutate(true)}
                disabled={refreshMutation.isPending || !!isCrawling}
              >
                {t("sources.fullReCrawl")}
              </Button>
              <Button variant="ghost" onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        {/* Website Info Card */}
        <Card className="p-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
              <Globe className="h-8 w-8 text-[var(--text-secondary)]" />
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">{t("sources.crawlStatus")}</p>
                <CrawlStatusBadge status={crawlStatus} />
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">{t("sources.pagesDiscovered")}</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {source.websitePagesTotal ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">{t("sources.pagesScraped")}</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {source.websitePagesScraped ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">{t("sources.parsedAt")}</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {source.lastScrapedAt
                    ? new Date(source.lastScrapedAt).toLocaleDateString()
                    : t("sources.notParsedYet")}
                </p>
              </div>
            </div>
          </div>
          {source.websiteError && (
            <div className="mt-3 text-sm text-red-500">{source.websiteError}</div>
          )}
        </Card>

        {/* Crawling indicator */}
        {isCrawling && (
          <Card className="p-4 mb-6 border-[var(--primary)] bg-[var(--primary)]/5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {t(`sources.crawlStatuses.${crawlStatus}` as Parameters<typeof t>[0])}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Pages List */}
        <PageSection title={t("sources.websitePages")}>
          <WebsitePagesList channelId={channelId} sourceId={sourceId} />
        </PageSection>
      </div>

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

const CRAWL_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  idle: "default",
  discovering: "info",
  scoring: "warning",
  scraping: "purple",
  completed: "success",
  failed: "error",
};

function CrawlStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();

  return (
    <Badge variant={CRAWL_STATUS_VARIANTS[status] ?? "default"}>
      {t(`sources.crawlStatuses.${status}` as Parameters<typeof t>[0])}
    </Badge>
  );
}
