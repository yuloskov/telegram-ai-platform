import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "~/hooks/useAuth";
import { Header } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Spinner } from "~/components/ui/spinner";
import { EmptyState } from "~/components/telegram/empty-state";
import { ChannelAvatar } from "~/components/telegram/channel-avatar";
import { Plus, MessageCircle, FileText, Radio } from "lucide-react";

interface Channel {
  id: string;
  telegramId: string;
  username: string | null;
  title: string;
  niche: string | null;
  tone: string;
  language: string;
  hashtags: string[];
  isActive: boolean;
  createdAt: string;
  _count?: {
    posts: number;
    contentSources: number;
  };
}

export default function ChannelsPage() {
  const { isLoading: authLoading } = useRequireAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/channels");
      const json = await res.json();
      return json.data as Channel[];
    },
    enabled: !authLoading,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  const channels = data || [];

  return (
    <PageLayout title="My Channels">
      <Header
        title="My Channels"
        backHref="/"
        actions={
          <Button asChild>
            <Link href="/channels/new">
              <Plus className="h-4 w-4" />
              Add Channel
            </Link>
          </Button>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-6">
        {channels.length === 0 ? (
          <PageSection>
            <Card>
              <EmptyState
                icon={<MessageCircle className="h-8 w-8 text-[var(--text-tertiary)]" />}
                title="No channels yet"
                description="Add your first Telegram channel to get started"
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
          </PageSection>
        ) : (
          <PageSection>
            <div className="space-y-3">
              {channels.map((channel) => (
                <Link key={channel.id} href={`/channels/${channel.id}`}>
                  <Card interactive className="p-4">
                    <div className="flex items-start gap-4">
                      <ChannelAvatar title={channel.title} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-[var(--text-primary)] truncate">
                            {channel.title}
                          </h3>
                          {channel.isActive && (
                            <span className="h-2 w-2 rounded-full bg-[var(--status-online)]" />
                          )}
                        </div>
                        {channel.username && (
                          <p className="text-sm text-[var(--text-secondary)]">
                            @{channel.username}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-tertiary)]">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {channel._count?.posts || 0} posts
                          </span>
                          <span className="flex items-center gap-1">
                            <Radio className="h-3.5 w-3.5" />
                            {channel._count?.contentSources || 0} sources
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <Badge>{channel.tone}</Badge>
                          {channel.niche && (
                            <Badge variant="primary">{channel.niche}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </PageSection>
        )}
      </div>
    </PageLayout>
  );
}
