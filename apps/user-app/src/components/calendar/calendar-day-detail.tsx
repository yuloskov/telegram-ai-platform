import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";
import { CalendarPostCard } from "./calendar-post-card";

interface CalendarPost {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  skippedAt: string | null;
  contentPlanId: string | null;
  contentPlanName: string | null;
  mediaFiles?: { id: string; url: string; type: string }[];
}

interface CalendarDayDetailProps {
  date: string | null;
  posts: CalendarPost[];
  onClose: () => void;
  onReschedule: (postIds: string[]) => void;
  onViewPost: (postId: string) => void;
  onEditPost: (post: CalendarPost) => void;
}

export function CalendarDayDetail({
  date,
  posts,
  onClose,
  onReschedule,
  onViewPost,
  onEditPost,
}: CalendarDayDetailProps) {
  const { t } = useI18n();

  if (!date) return null;

  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const skippedPosts = posts.filter((p) => p.skippedAt);
  const hasSkippedPosts = skippedPosts.length > 0;

  const handleRescheduleSkipped = () => {
    onReschedule(skippedPosts.map((p) => p.id));
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--bg-primary)] border-l border-[var(--border-secondary)] shadow-xl z-40 overflow-hidden flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-secondary)]">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{formattedDate}</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {posts.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            {t("calendar.noPostsForDay")}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <CalendarPostCard
                key={post.id}
                post={post}
                onView={() => onViewPost(post.id)}
                onEdit={() => onEditPost(post)}
                onReschedule={() => onReschedule([post.id])}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with bulk actions */}
      {hasSkippedPosts && (
        <div className="p-4 border-t border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {t("calendar.skippedPosts", { count: skippedPosts.length })}
            </span>
            <Button variant="secondary" size="sm" onClick={handleRescheduleSkipped}>
              {t("calendar.reschedule")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
