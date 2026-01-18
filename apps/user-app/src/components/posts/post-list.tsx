import { FileText, Send, RotateCcw, Sparkles } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { EmptyState } from "~/components/telegram/empty-state";
import { StatusBadge } from "~/components/telegram/status-badge";
import { useI18n } from "~/i18n";

interface Post {
  id: string;
  content: string;
  status: string;
  createdAt: string;
}

interface PostListProps {
  posts: Post[];
  isLoading: boolean;
  onPublish: (postId: string) => void;
  isPublishing: boolean;
  onOpenGenerator: () => void;
}

export function PostList({
  posts,
  isLoading,
  onPublish,
  isPublishing,
  onOpenGenerator,
}: PostListProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <Card>
        <div className="p-8 flex items-center justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<FileText className="h-8 w-8 text-[var(--text-tertiary)]" />}
          title={t("posts.noPostsTitle")}
          description={t("posts.noPostsDescription")}
          action={
            <Button onClick={onOpenGenerator}>
              <Sparkles className="h-4 w-4" />
              {t("posts.generateWithAI")}
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Card key={post.id} interactive className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--text-primary)] line-clamp-2">
                {post.content}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <StatusBadge
                  status={
                    post.status as
                      | "draft"
                      | "scheduled"
                      | "publishing"
                      | "published"
                      | "failed"
                      | "pending_review"
                  }
                />
                <span className="text-xs text-[var(--text-tertiary)]">
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {post.status === "draft" && (
                <Button
                  size="sm"
                  onClick={() => onPublish(post.id)}
                  disabled={isPublishing}
                >
                  <Send className="h-3.5 w-3.5" />
                  {t("posts.publish")}
                </Button>
              )}
              {post.status === "failed" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onPublish(post.id)}
                  disabled={isPublishing}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("common.retry")}
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
