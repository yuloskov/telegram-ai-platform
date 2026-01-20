import { Check, Eye } from "lucide-react";
import { cn } from "~/lib/utils";

interface ScrapedPost {
  id: string;
  text: string | null;
  views: number;
  forwards: number;
  reactions: number;
  usedForGeneration: boolean;
}

interface SourcePostSelectorProps {
  posts: ScrapedPost[];
  selectedIds: Set<string>;
  onToggle: (postId: string) => void;
}

export function SourcePostSelector({ posts, selectedIds, onToggle }: SourcePostSelectorProps) {
  if (posts.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-[var(--text-tertiary)]">
        No posts available
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto p-2">
      {posts.map((post) => {
        const isSelected = selectedIds.has(post.id);
        const hasText = post.text && post.text.trim().length > 0;

        return (
          <button
            key={post.id}
            onClick={() => onToggle(post.id)}
            disabled={!hasText}
            className={cn(
              "w-full text-left p-3 rounded-[var(--radius-md)] border transition-colors",
              isSelected
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]"
                : "border-[var(--border-secondary)] bg-[var(--bg-secondary)] hover:border-[var(--border-primary)]",
              !hasText && "opacity-50 cursor-not-allowed"
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
                  {hasText ? post.text : "(Media only)"}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                    <Eye className="h-3 w-3" />
                    {post.views.toLocaleString()}
                  </span>
                  {post.usedForGeneration && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--status-info-subtle)] text-[var(--status-info)]">
                      Used
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
