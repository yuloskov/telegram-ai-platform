import { useRouter } from "next/router";
import { Sparkles, Send, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ContentList } from "~/components/content/content-list";
import { ContentListItem, type ChipProps } from "~/components/content/content-list-item";
import { PostMetrics } from "~/components/content/content-metrics";
import { useContentSelectionStore } from "~/stores/content-selection-store";
import { useI18n } from "~/i18n";
import { getValidMediaUrls, getThumbnailUrl } from "~/lib/media";
import type { PostStatus, MediaFile } from "~/types";

// Status config with variants
const statusVariants: Record<PostStatus, ChipProps["variant"]> = {
  draft: "default",
  scheduled: "info",
  publishing: "warning",
  published: "success",
  failed: "error",
  pending_review: "info",
};

interface Post {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  mediaFiles?: MediaFile[];
}

interface PostListProps {
  posts: Post[];
  isLoading: boolean;
  channelId: string;
  selectionEnabled?: boolean;
  onOpenGenerator: () => void;
}

export function PostList({
  posts,
  isLoading,
  channelId,
  selectionEnabled = true,
  onOpenGenerator,
}: PostListProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { selectedIds, toggleSelection, selectAll, isSelected } =
    useContentSelectionStore();

  const handleClick = (postId: string) => {
    router.push(`/channels/${channelId}/posts/${postId}`);
  };

  const itemIds = posts.map((post) => post.id);

  // Status icons map
  const statusIcons: Record<PostStatus, React.ReactNode> = {
    draft: null,
    scheduled: <Clock className="h-3 w-3" />,
    publishing: <Loader2 className="h-3 w-3 animate-spin" />,
    published: <CheckCircle className="h-3 w-3" />,
    failed: <AlertCircle className="h-3 w-3" />,
    pending_review: <Send className="h-3 w-3" />,
  };

  const getStatusLabel = (status: PostStatus): string => {
    const labels: Record<PostStatus, string> = {
      draft: t("posts.status.draft"),
      scheduled: t("posts.status.scheduled"),
      publishing: t("posts.status.publishing"),
      published: t("posts.status.published"),
      failed: t("posts.status.failed"),
      pending_review: t("posts.status.pending_review"),
    };
    return labels[status] ?? labels.draft;
  };

  return (
    <ContentList
      itemIds={itemIds}
      selectedIds={selectedIds}
      isLoading={isLoading}
      selectionEnabled={selectionEnabled}
      emptyTitle={t("posts.noPostsTitle")}
      emptyDescription={t("posts.noPostsDescription")}
      emptyAction={
        <Button onClick={onOpenGenerator}>
          <Sparkles className="h-4 w-4" />
          {t("posts.generateWithAI")}
        </Button>
      }
      onSelectAll={selectAll}
    >
      {posts.map((post) => {
        const status = post.status as PostStatus;
        const chips: ChipProps[] = [{
          label: getStatusLabel(status),
          icon: statusIcons[status],
          variant: statusVariants[status] ?? statusVariants.draft,
        }];

        // Get valid media URLs for display
        const mediaUrls = post.mediaFiles?.map((mf) => mf.url) ?? [];
        const validMediaUrls = getValidMediaUrls(mediaUrls);
        const thumbnailUrl = getThumbnailUrl(mediaUrls);

        return (
          <ContentListItem
            key={post.id}
            id={post.id}
            text={post.content}
            chips={chips}
            thumbnailUrl={thumbnailUrl}
            imageCount={validMediaUrls.length}
            mediaUrls={mediaUrls}
            metrics={
              <PostMetrics
                createdAt={post.createdAt}
                publishedAt={post.publishedAt}
                scheduledAt={post.scheduledAt}
              />
            }
            date={post.createdAt}
            selected={isSelected(post.id)}
            selectionEnabled={selectionEnabled}
            onSelect={toggleSelection}
            onClick={handleClick}
          />
        );
      })}
    </ContentList>
  );
}
