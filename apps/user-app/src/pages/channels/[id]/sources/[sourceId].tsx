import { useState } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Card } from "~/components/ui/card";
import { ScrapedContentList } from "~/components/sources/scraped-content-list";
import { Download, Trash2 } from "lucide-react";
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

  const [isScraping, setIsScraping] = useState(false);
  const [page, setPage] = useState(1);

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
    queryKey: ["source-content", channelId, sourceId, page],
    queryFn: async () => {
      const res = await fetch(
        `/api/channels/${channelId}/sources/${sourceId}/content?page=${page}&limit=20`
      );
      const json = await res.json();
      return json as ContentResponse;
    },
    enabled: !!channelId && !!sourceId && !authLoading,
  });

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      setIsScraping(true);
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}/scrape`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSettled: () => {
      setIsScraping(false);
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
                disabled={isScraping}
              >
                {isScraping ? (
                  <>
                    <Spinner size="sm" />
                    {t("sources.scraping")}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {t("sources.scrapeNow")}
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm(t("sources.deleteConfirm"))) {
                    deleteMutation.mutate();
                  }
                }}
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

        {/* Scraped Content */}
        <PageSection title={t("sources.scrapedContent")}>
          <ScrapedContentList content={content} isLoading={contentLoading} />

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
                Next
              </Button>
            </div>
          )}
        </PageSection>
      </div>
    </PageLayout>
  );
}
