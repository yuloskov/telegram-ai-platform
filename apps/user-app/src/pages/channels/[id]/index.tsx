import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { useChannel } from "~/hooks/useChannel";
import { useCreatePost } from "~/hooks/usePostMutations";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { PostEditorModal } from "~/components/posts/post-editor-modal";
import { PostList } from "~/components/posts/post-list";
import { Sparkles, Plus, Settings, Lightbulb, ArrowRight } from "lucide-react";
import { Card } from "~/components/ui/card";
import { useI18n } from "~/i18n";
import type { PostListItem } from "~/types";

export default function ChannelDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [showPostEditor, setShowPostEditor] = useState(false);
  const [postContent, setPostContent] = useState("");

  // Use shared channel hook
  const { data: channel, isLoading: channelLoading } = useChannel(id, {
    enabled: !authLoading,
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["posts", id],
    queryFn: async () => {
      const res = await fetch(`/api/posts?channelId=${id}`);
      const json = await res.json();
      return json as { data: PostListItem[]; pagination: unknown };
    },
    enabled: !!id && !authLoading,
  });

  // Use shared create post hook
  const createPostMutation = useCreatePost({
    channelId: id,
    onSuccess: () => {
      setShowPostEditor(false);
      setPostContent("");
    },
  });

  // Handle loading state
  if (authLoading || channelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Handle not found
  if (!channel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <p className="text-[var(--text-secondary)]">{t("channels.notFound")}</p>
      </div>
    );
  }

  const posts = postsData?.data || [];

  const handleCancelEditor = () => {
    setShowPostEditor(false);
    setPostContent("");
  };

  return (
    <PageLayout title={channel.title}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        <PageHeader
          title={channel.title}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={() => router.push(`/channels/${id}/generate`)}>
                <Sparkles className="h-4 w-4" />
                {t("channels.generate")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPostContent("");
                  setShowPostEditor(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t("channels.newPost")}
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/channels/${id}/settings`}>
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          }
        />

        {channel.username && (
          <p className="text-sm text-[var(--text-secondary)] -mt-4 mb-6">
            @{channel.username}
          </p>
        )}

        {/* Similar Channels Feature Card */}
        <Card interactive className="mb-6">
          <Link href={`/channels/${id}/sources`} className="block p-4">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--accent-primary-subtle)] flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-[var(--accent-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  {t("sources.featureCardTitle")}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                  {t("sources.featureCardDescription")}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--text-tertiary)] shrink-0" />
            </div>
          </Link>
        </Card>

        <PostEditorModal
          open={showPostEditor}
          onOpenChange={setShowPostEditor}
          content={postContent}
          onContentChange={setPostContent}
          onSave={() => createPostMutation.mutate(postContent)}
          onCancel={handleCancelEditor}
          isSaving={createPostMutation.isPending}
          channelName={channel.title}
          isGenerated={false}
        />

        {/* Posts List */}
        <PageSection title={t("posts.title")}>
          <PostList
            posts={posts}
            isLoading={postsLoading}
            channelId={id as string}
            onOpenGenerator={() => router.push(`/channels/${id}/generate`)}
          />
        </PageSection>
      </div>
    </PageLayout>
  );
}
