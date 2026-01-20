import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { EngagementMetrics } from "~/components/sources/engagement-metrics";
import { useI18n } from "~/i18n";

interface Channel {
  id: string;
  title: string;
}

interface ContentSource {
  id: string;
  telegramUsername: string;
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
  source: {
    telegramUsername: string;
  };
}

export default function ContentDetailPage() {
  const router = useRouter();
  const { id: channelId, sourceId, contentId } = router.query;
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

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

  const { data: content, isLoading: contentLoading } = useQuery({
    queryKey: ["content", channelId, sourceId, contentId],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}/content/${contentId}`);
      const json = await res.json();
      return json.data as ScrapedContent;
    },
    enabled: !!channelId && !!sourceId && !!contentId && !authLoading,
  });

  const isLoading = authLoading || channelLoading || sourceLoading || contentLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!channel || !source || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <p className="text-[var(--text-secondary)]">{t("common.notFound")}</p>
      </div>
    );
  }

  const telegramUrl = `https://t.me/${source.telegramUsername.replace(/^@/, "")}/${content.telegramMessageId}`;

  return (
    <PageLayout title={`Post - @${source.telegramUsername}`}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
        <PageHeader
          title={t("sources.postDetail")}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title, href: `/channels/${channelId}` },
            { label: t("sources.title"), href: `/channels/${channelId}/sources` },
            { label: `@${source.telegramUsername}`, href: `/channels/${channelId}/sources/${sourceId}` },
            { label: t("sources.postDetail") },
          ]}
          actions={
            <Button variant="ghost" size="sm" onClick={() => window.open(telegramUrl, "_blank")}>
              <ExternalLink className="h-4 w-4" />
              {t("sources.openInTelegram")}
            </Button>
          }
        />

        <Card className="p-6">
          {/* Media */}
          {content.mediaUrls.length > 0 && (
            <div className="mb-4 grid gap-2" style={{ gridTemplateColumns: content.mediaUrls.length === 1 ? "1fr" : "repeat(2, 1fr)" }}>
              {content.mediaUrls
                .filter((url) => !url.startsWith("skipped:") && !url.startsWith("failed:"))
                .map((url, idx) => (
                  <div key={idx} className="rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-secondary)]">
                    <img
                      src={`/api/media/${url}`}
                      alt=""
                      className="w-full h-auto max-h-96 object-contain"
                      onError={(e) => {
                        e.currentTarget.parentElement!.style.display = "none";
                      }}
                    />
                  </div>
                ))}
            </div>
          )}

          {/* Text content */}
          <div className="mb-4">
            {content.text ? (
              <p className="text-[var(--text-primary)] whitespace-pre-wrap">{content.text}</p>
            ) : (
              <p className="text-[var(--text-tertiary)] italic">{t("sources.mediaOnly")}</p>
            )}
          </div>

          {/* Metrics and date */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-secondary)]">
            <EngagementMetrics
              views={content.views}
              forwards={content.forwards}
              reactions={content.reactions}
            />
            <span className="text-sm text-[var(--text-tertiary)]">
              {new Date(content.scrapedAt).toLocaleString()}
            </span>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
