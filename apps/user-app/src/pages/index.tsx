import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { AppHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { EmptyState } from "~/components/telegram/empty-state";
import { ChannelAvatar } from "~/components/telegram/channel-avatar";
import { Plus, Layers, Sparkles, MessageCircle } from "lucide-react";

interface Channel {
  id: string;
  title: string;
  username: string | null;
  _count?: {
    posts: number;
  };
}

export default function Home() {
  const { isLoading } = useRequireAuth();
  const { user, logout } = useAuth();

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
    <PageLayout title="Dashboard" description="Manage your AI-powered Telegram channels">
      <AppHeader user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto">
        {/* Welcome Section */}
        <PageSection className="mt-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
              Welcome back{user?.displayName ? `, ${user.displayName}` : ""}!
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage your Telegram channels and create AI-powered content.
            </p>
          </div>
        </PageSection>

        {/* Quick Actions */}
        <PageSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/channels/new">
              <Card interactive className="p-5 h-full">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-tertiary)] mb-3">
                  <Plus className="h-5 w-5 text-[var(--accent-primary)]" />
                </div>
                <h3 className="font-medium text-[var(--text-primary)] mb-1">
                  Add Channel
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Connect a new Telegram channel
                </p>
              </Card>
            </Link>

            <Link href="/channels">
              <Card interactive className="p-5 h-full">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[#d4edda] mb-3">
                  <Layers className="h-5 w-5 text-[#155724]" />
                </div>
                <h3 className="font-medium text-[var(--text-primary)] mb-1">
                  My Channels
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  View and manage your channels
                </p>
              </Card>
            </Link>

            <Card className={`p-5 ${!hasChannels ? "opacity-50" : ""}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[#f3e8ff] mb-3">
                <Sparkles className="h-5 w-5 text-[#7c3aed]" />
              </div>
              <h3 className="font-medium text-[var(--text-primary)] mb-1">
                Generate Content
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {hasChannels ? "Create AI-powered posts" : "Select a channel first"}
              </p>
            </Card>
          </div>
        </PageSection>

        {/* Recent Channels or Empty State */}
        <PageSection
          title={hasChannels ? "Recent Channels" : undefined}
          actions={
            hasChannels && (
              <Link href="/channels">
                <Button variant="ghost" size="sm">
                  View all
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
            <div className="space-y-2">
              {channels.slice(0, 3).map((channel) => (
                <Link key={channel.id} href={`/channels/${channel.id}`}>
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
                        {channel._count?.posts || 0} posts
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<MessageCircle className="h-8 w-8 text-[var(--text-tertiary)]" />}
                title="No channels yet"
                description="Get started by adding your first Telegram channel"
                action={
                  <Button asChild>
                    <Link href="/channels/new">
                      <Plus className="h-4 w-4" />
                      Add Channel
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
