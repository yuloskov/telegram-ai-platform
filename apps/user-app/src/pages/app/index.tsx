import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { EmptyState } from "~/components/telegram/empty-state";
import { ChannelAvatar } from "~/components/telegram/channel-avatar";
import { Plus, Layers, Sparkles, MessageCircle } from "lucide-react";
import { useI18n } from "~/i18n";

interface Channel {
  id: string;
  title: string;
  username: string | null;
  _count?: {
    posts: number;
  };
}

export default function AppDashboard() {
  const { isLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/channels");
      const json = await res.json();
      return json.data as Channel[];
    },
    enabled: !isLoading,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasChannels = channels && channels.length > 0;

  return (
    <PageLayout title={t("dashboard.title")} description={t("dashboard.description")}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        <PageHeader
          title={`${t("dashboard.welcomeBack")}${user?.displayName ? `, ${user.displayName}` : ""}!`}
        />

        {/* Quick Actions */}
        <PageSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/channels/new">
              <Card interactive className="p-5 h-full">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-tertiary)] mb-3">
                  <Plus className="h-5 w-5 text-[var(--accent-primary)]" />
                </div>
                <h3 className="font-medium text-[var(--text-primary)] mb-1">
                  {t("dashboard.addChannel")}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t("dashboard.addChannelDescription")}
                </p>
              </Card>
            </Link>

            <Link href="/channels">
              <Card interactive className="p-5 h-full">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[#d4edda] mb-3">
                  <Layers className="h-5 w-5 text-[#155724]" />
                </div>
                <h3 className="font-medium text-[var(--text-primary)] mb-1">
                  {t("dashboard.myChannels")}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t("dashboard.myChannelsDescription")}
                </p>
              </Card>
            </Link>

            <Card className={`p-5 ${!hasChannels ? "opacity-50" : ""}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[#f3e8ff] mb-3">
                <Sparkles className="h-5 w-5 text-[#7c3aed]" />
              </div>
              <h3 className="font-medium text-[var(--text-primary)] mb-1">
                {t("dashboard.generateContent")}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {hasChannels ? t("dashboard.generateContentDescription") : t("dashboard.selectChannelFirst")}
              </p>
            </Card>
          </div>
        </PageSection>

        {/* Recent Channels or Empty State */}
        <PageSection
          title={hasChannels ? t("dashboard.recentChannels") : undefined}
          actions={
            hasChannels && (
              <Link href="/channels">
                <Button variant="ghost" size="sm">
                  {t("common.viewAll")}
                </Button>
              </Link>
            )
          }
        >
          {channelsLoading ? (
            <Card className="p-8 flex items-center justify-center">
              <Spinner />
            </Card>
          ) : hasChannels ? (
            <div className="flex flex-col gap-2">
              {channels.slice(0, 3).map((channel) => (
                <div key={channel.id}>
                  <Link href={`/channels/${channel.id}`}>
                    <Card interactive className="p-4">
                      <div className="flex items-center gap-3">
                        <ChannelAvatar title={channel.title} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-[var(--text-primary)] truncate">
                            {channel.title}
                          </h3>
                          {channel.username && (
                            <p className="text-sm text-[var(--text-secondary)]">
                              @{channel.username}
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-[var(--text-tertiary)]">
                          {channel._count?.posts || 0} {t("dashboard.posts")}
                        </span>
                      </div>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<MessageCircle className="h-8 w-8 text-[var(--text-tertiary)]" />}
                title={t("dashboard.noChannelsTitle")}
                description={t("dashboard.noChannelsDescription")}
                action={
                  <Button asChild>
                    <Link href="/channels/new">
                      <Plus className="h-4 w-4" />
                      {t("dashboard.addChannel")}
                    </Link>
                  </Button>
                }
              />
            </Card>
          )}
        </PageSection>
      </div>
    </PageLayout>
  );
}
