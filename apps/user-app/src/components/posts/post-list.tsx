import { useRouter } from "next/router";
import { Sparkles, Calendar, Send, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ContentList } from "~/components/content/content-list";
import { ContentListItem, type ChipProps } from "~/components/content/content-list-item";
import { PostMetrics } from "~/components/content/content-metrics";
import { useContentSelectionStore } from "~/stores/content-selection-store";
import { useI18n } from "~/i18n";

interface Post {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  publishedAt?: string | null;
  scheduledAt?: string | null;
}

interface PostListProps {
  posts: Post[];
  isLoading: boolean;
  channelId: string;
  selectionEnabled?: boolean;
  onOpenGenerator: () => void;
}

type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed" | "pending_review";

const statusConfig: Record<PostStatus, { variant: ChipProps["variant"]; icon: React.ReactNode }> = {
  draft: { variant: "default", icon: null },
  scheduled: { variant: "info", icon: <Clock className="h-3 w-3" /> },
  publishing: { variant: "warning", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  published: { variant: "success", icon: <CheckCircle className="h-3 w-3" /> },
  failed: { variant: "error", icon: <AlertCircle className="h-3 w-3" /> },
  pending_review: { variant: "info", icon: <Send className="h-3 w-3" /> },
};

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

  const getStatusLabel = (status: PostStatus): string => {
    switch (status) {
      case "draft":
        return t("posts.status.draft");
      case "scheduled":
        return t("posts.status.scheduled");
      case "publishing":
        return t("posts.status.publishing");
      case "published":
        return t("posts.status.published");
      case "failed":
        return t("posts.status.failed");
      case "pending_review":
        return t("posts.status.pending_review");
      default:
        return t("posts.status.draft");
    }
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
        const config = statusConfig[status] || statusConfig.draft;

        const chips: ChipProps[] = [
          {
            label: getStatusLabel(status),
            icon: config.icon,
            variant: config.variant,
          },
        ];

        return (
          <ContentListItem
            key={post.id}
            id={post.id}
            text={post.content}
            chips={chips}
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
