import type React from "react";
import { useState } from "react";
import { useRouter } from "next/router";
import { Clock, CheckCircle, AlertCircle, Loader2, Send } from "lucide-react";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { useChannel } from "~/hooks/useChannel";
import { usePost, usePostMutations } from "~/hooks/usePostMutations";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout } from "~/components/layout/page-layout";
import { Spinner } from "~/components/ui/spinner";
import { ConfirmModal } from "~/components/ui/confirm-modal";
import { PostEditorModal } from "~/components/posts/post-editor-modal";
import { PostActions } from "~/components/posts/post-actions";
import { ContentDetailCard } from "~/components/content/content-detail-card";
import { PostMetrics } from "~/components/content/content-metrics";
import { useI18n } from "~/i18n";
import type { PostStatus } from "~/types";
import type { ChipProps } from "~/components/content/content-list-item";

export default function PostDetailPage() {
  const router = useRouter();
  const { id: channelId, postId } = router.query;
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState("");

  const { data: channel, isLoading: channelLoading } = useChannel(channelId, {
    enabled: !authLoading,
  });

  const { data: post, isLoading: postLoading } = usePost(postId, {
    enabled: !authLoading,
  });

  const { publishMutation, updateMutation, deleteMutation } = usePostMutations({
    postId,
    channelId,
    onDeleteSuccess: () => router.push(`/channels/${channelId}`),
    onUpdateSuccess: () => setEditModalOpen(false),
  });

  const handleEditClick = () => {
    if (post) {
      setEditContent(post.content);
      setEditModalOpen(true);
    }
  };

  const isLoading = authLoading || channelLoading || postLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!channel || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <p className="text-[var(--text-secondary)]">{t("common.notFound")}</p>
      </div>
    );
  }

  const status = post.status as PostStatus;
  const canEdit = ["draft", "failed"].includes(post.status);
  const canPublish = post.status === "draft";
  const canRetry = post.status === "failed";
  const canDelete = post.status === "draft";

  const telegramUrl =
    post.status === "published" && post.telegramMessageId && channel.username
      ? `https://t.me/${channel.username}/${post.telegramMessageId}`
      : null;

  const getStatusLabel = (s: PostStatus): string => {
    const labels: Record<PostStatus, string> = {
      draft: t("posts.status.draft"),
      scheduled: t("posts.status.scheduled"),
      publishing: t("posts.status.publishing"),
      published: t("posts.status.published"),
      failed: t("posts.status.failed"),
      pending_review: t("posts.status.pending_review"),
    };
    return labels[s] ?? labels.draft;
  };

  const statusConfig: Record<PostStatus, { variant: ChipProps["variant"]; icon: React.ReactNode }> = {
    draft: { variant: "default", icon: null },
    scheduled: { variant: "info", icon: <Clock className="h-3 w-3" /> },
    publishing: { variant: "warning", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    published: { variant: "success", icon: <CheckCircle className="h-3 w-3" /> },
    failed: { variant: "error", icon: <AlertCircle className="h-3 w-3" /> },
    pending_review: { variant: "info", icon: <Send className="h-3 w-3" /> },
  };

  const config = statusConfig[status] ?? statusConfig.draft;
  const chips: ChipProps[] = [{ label: getStatusLabel(status), icon: config.icon, variant: config.variant }];

  return (
    <PageLayout title={`${t("posts.postDetail")} - ${channel.title}`}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
        <PageHeader
          title={t("posts.postDetail")}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title, href: `/channels/${channelId}` },
            { label: t("posts.postDetail") },
          ]}
          actions={
            <PostActions
              canEdit={canEdit}
              canPublish={canPublish}
              canRetry={canRetry}
              canDelete={canDelete}
              telegramUrl={telegramUrl}
              isPublishing={publishMutation.isPending}
              onEdit={handleEditClick}
              onPublish={() => publishMutation.mutate()}
              onDelete={() => setDeleteConfirmOpen(true)}
            />
          }
        />

        <ContentDetailCard
          text={post.content}
          chips={chips}
          mediaUrls={post.mediaFiles?.map((mf) => mf.url) ?? []}
          metrics={
            <PostMetrics
              createdAt={post.createdAt}
              publishedAt={post.publishedAt}
              scheduledAt={post.scheduledAt}
            />
          }
          date={post.createdAt}
          errorMessage={post.errorMessage}
        />
      </div>

      <PostEditorModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        content={editContent}
        onContentChange={setEditContent}
        onSave={() => updateMutation.mutate(editContent)}
        onCancel={() => setEditModalOpen(false)}
        isSaving={updateMutation.isPending}
        channelName={channel.title}
        isGenerated={false}
        existingMedia={post.mediaFiles}
      />

      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t("posts.deleteConfirmTitle")}
        description={t("posts.deleteConfirmDescription")}
        confirmLabel={t("common.delete")}
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </PageLayout>
  );
}
