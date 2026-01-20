import { Check, Eye, Image } from "lucide-react";
import { cn } from "~/lib/utils";

interface MediaFile {
  type: string;
  url: string;
}

interface ScrapedPost {
  id: string;
  text: string | null;
  views: number;
  mediaFiles: MediaFile[];
}

interface SourcePostSelectorProps {
  posts: ScrapedPost[];
  selectedIds: Set<string>;
  onToggle: (postId: string) => void;
}

// Check if a post is video-only (has video but no text and no images)
function isVideoOnly(post: ScrapedPost): boolean {
  const hasText = post.text && post.text.trim().length > 0;
  const hasVideo = post.mediaFiles.some((m) => m.type === "video");
  const hasImage = post.mediaFiles.some((m) => m.type === "image" || m.type === "photo");
  return !hasText && hasVideo && !hasImage;
}

export function SourcePostSelector({ posts, selectedIds, onToggle }: SourcePostSelectorProps) {
  // Filter out video-only posts
  const selectablePosts = posts.filter((post) => !isVideoOnly(post));

  if (selectablePosts.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-[var(--text-tertiary)]">
        No posts available
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto p-2">
      {selectablePosts.map((post) => {
        const isSelected = selectedIds.has(post.id);
        const hasText = post.text && post.text.trim().length > 0;
        const hasImages = post.mediaFiles.some(
          (m) => m.type === "image" || m.type === "photo"
        );

        return (
          <button
            key={post.id}
            onClick={() => onToggle(post.id)}
            className={cn(
              "w-full text-left p-3 rounded-[var(--radius-md)] border transition-colors",
              isSelected
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]"
                : "border-[var(--border-secondary)] bg-[var(--bg-secondary)] hover:border-[var(--border-primary)]"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "shrink-0 w-5 h-5 rounded border flex items-center justify-center mt-0.5",
                  isSelected
                    ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
                    : "border-[var(--border-primary)] bg-[var(--bg-primary)]"
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] line-clamp-2">
                  {hasText ? post.text : "(Image only)"}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                    <Eye className="h-3 w-3" />
                    {post.views.toLocaleString()}
                  </span>
                  {!hasText && hasImages && (
                    <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                      <Image className="h-3 w-3" />
                      {post.mediaFiles.filter((m) => m.type === "image" || m.type === "photo").length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
