import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { useChannel } from "~/hooks/useChannel";
import { useCreatePost } from "~/hooks/usePostMutations";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { PostEditorModal } from "~/components/posts/post-editor-modal";
import { PostList } from "~/components/posts/post-list";
import { SelectionToolbar } from "~/components/posts/selection-toolbar";
import { ScheduleModal } from "~/components/posts/schedule-modal";
import { useContentSelectionStore } from "~/stores/content-selection-store";
import { Sparkles, Plus, Settings, Lightbulb, ArrowRight, Calendar, CalendarDays } from "lucide-react";
import { Card } from "~/components/ui/card";
import { useI18n } from "~/i18n";
import type { PostListItem, PostImage } from "~/types";

export default function ChannelDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [showPostEditor, setShowPostEditor] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [generatedImages, setGeneratedImages] = useState<PostImage[]>([]);

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

  // Selection store
  const { selectedIds, clearSelection } = useContentSelectionStore();
  const queryClient = useQueryClient();

  // Get selected posts info for determining available actions
  const posts = postsData?.data || [];
  const selectedPosts = useMemo(() => {
    return posts.filter((p) => selectedIds.has(p.id));
  }, [posts, selectedIds]);

  const canPublish = selectedPosts.some((p) => p.status === "draft" || p.status === "failed");
  const canDelete = selectedPosts.some((p) => p.status === "draft" || p.status === "scheduled");
  const canSchedule = selectedPosts.some((p) => ["draft", "failed", "scheduled"].includes(p.status));

  // Bulk publish mutation
  const bulkPublishMutation = useMutation({
    mutationFn: async (postIds: string[]) => {
      const res = await fetch("/api/posts/bulk-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", id] });
      clearSelection();
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (postIds: string[]) => {
      const res = await fetch("/api/posts/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", id] });
      clearSelection();
    },
  });

  // Bulk schedule mutation
  const bulkScheduleMutation = useMutation({
    mutationFn: async ({ postIds, scheduledAt }: { postIds: string[]; scheduledAt: string }) => {
      const res = await fetch("/api/posts/bulk-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds, scheduledAt }),
      });
      if (!res.ok) throw new Error("Failed to schedule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", id] });
      clearSelection();
      setShowScheduleModal(false);
    },
  });

  const handleBulkPublish = () => {
    const publishableIds = selectedPosts
      .filter((p) => p.status === "draft" || p.status === "failed")
      .map((p) => p.id);
    if (publishableIds.length > 0) {
      bulkPublishMutation.mutate(publishableIds);
    }
  };

  const handleBulkDelete = () => {
    const deletableIds = selectedPosts
      .filter((p) => p.status === "draft" || p.status === "scheduled")
      .map((p) => p.id);
    if (deletableIds.length > 0) {
      bulkDeleteMutation.mutate(deletableIds);
    }
  };

  const handleBulkSchedule = (scheduledAt: Date) => {
    const schedulableIds = selectedPosts
      .filter((p) => ["draft", "failed", "scheduled"].includes(p.status))
      .map((p) => p.id);
    if (schedulableIds.length > 0) {
      bulkScheduleMutation.mutate({
        postIds: schedulableIds,
        scheduledAt: scheduledAt.toISOString(),
      });
    }
  };

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

  const handleCancelEditor = () => {
    setShowPostEditor(false);
    setPostContent("");
    setGeneratedImages([]);
  };

  const handleNewImageGenerated = (newImage: PostImage) => {
    setGeneratedImages((prev) => [...prev, newImage]);
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
        <Card interactive className="mb-4">
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

        {/* Content Plans Feature Card */}
        <Card interactive className="mb-4">
          <Link href={`/channels/${id}/content-plans`} className="block p-4">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--accent-secondary-subtle)] flex items-center justify-center">
                <Calendar className="h-5 w-5 text-[var(--accent-secondary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  {t("contentPlans.featureCardTitle")}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                  {t("contentPlans.featureCardDescription")}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--text-tertiary)] shrink-0" />
            </div>
          </Link>
        </Card>

        {/* Calendar Feature Card */}
        <Card interactive className="mb-6">
          <Link href={`/channels/${id}/calendar`} className="block p-4">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  {t("calendar.title")}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                  View all scheduled, published, and skipped posts in a calendar view
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--text-tertiary)] shrink-0" />
            </div>
          </Link>
        </Card>

        <PostEditorModal
          open={showPostEditor}
          onOpenChange={(open) => !open && handleCancelEditor()}
          content={postContent}
          onContentChange={setPostContent}
          onSave={() => createPostMutation.mutate(postContent)}
          onCancel={handleCancelEditor}
          isSaving={createPostMutation.isPending}
          channelName={channel.title}
          channelId={id as string}
          isGenerated={false}
          onNewImageGenerated={handleNewImageGenerated}
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

      {/* Selection Toolbar */}
      <SelectionToolbar
        selectedCount={selectedIds.size}
        canPublish={canPublish}
        canDelete={canDelete}
        canSchedule={canSchedule}
        onPublish={handleBulkPublish}
        onDelete={handleBulkDelete}
        onSchedule={() => setShowScheduleModal(true)}
        onClear={clearSelection}
        isPublishing={bulkPublishMutation.isPending}
        isDeleting={bulkDeleteMutation.isPending}
        isScheduling={bulkScheduleMutation.isPending}
      />

      {/* Bulk Schedule Modal */}
      <ScheduleModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        currentScheduledAt={null}
        onSchedule={handleBulkSchedule}
        onUnschedule={() => {}}
        isLoading={bulkScheduleMutation.isPending}
        postCount={selectedPosts.filter((p) => ["draft", "failed", "scheduled"].includes(p.status)).length}
      />
    </PageLayout>
  );
}
