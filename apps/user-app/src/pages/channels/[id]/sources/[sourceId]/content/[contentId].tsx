import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, CheckCircle } from "lucide-react";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { ContentDetailCard } from "~/components/content/content-detail-card";
import { EngagementMetrics } from "~/components/content/content-metrics";
import { type ChipProps } from "~/components/content/content-list-item";
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

  const chips: ChipProps[] = [];
  if (content.usedForGeneration) {
    chips.push({
      label: t("sources.usedBadge"),
      icon: <CheckCircle className="h-3 w-3" />,
      variant: "info",
    });
  }

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

        <ContentDetailCard
          text={content.text}
          mediaUrls={content.mediaUrls}
          chips={chips}
          metrics={
            <EngagementMetrics
              views={content.views}
              forwards={content.forwards}
              reactions={content.reactions}
            />
          }
          date={content.scrapedAt}
        />
      </div>
    </PageLayout>
  );
}
