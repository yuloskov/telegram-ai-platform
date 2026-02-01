import { useRouter } from "next/router";
import { Images, Eye, Maximize2 } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { TelegramHtml } from "~/components/telegram/telegram-html";
import { useI18n } from "~/i18n";
import { isPostVideoOnly, getValidMediaUrls, getMediaSrc } from "~/lib/media";

interface ScrapedPost {
  id: string;
  text: string | null;
  views: number;
  mediaUrls: string[];
}

interface SourcePostSelectorProps {
  posts: ScrapedPost[];
  selectedIds: Set<string>;
  onToggle: (postId: string) => void;
  channelId?: string;
  sourceId?: string;
}

export function SourcePostSelector({ posts, selectedIds, onToggle, channelId, sourceId }: SourcePostSelectorProps) {
  const { t } = useI18n();
  const router = useRouter();

  // Filter out video-only posts
  const selectablePosts = posts.filter((post) => !isPostVideoOnly(post));

  if (selectablePosts.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-[var(--text-tertiary)]">
        {t("generatePage.noPostsAvailable")}
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto p-2">
      {selectablePosts.map((post) => {
        const isSelected = selectedIds.has(post.id);
        const hasText = post.text && post.text.trim().length > 0;

        // Get valid image URLs
        const validImageUrls = getValidMediaUrls(post.mediaUrls);
        const thumbnailUrl = validImageUrls[0];
        const imageCount = validImageUrls.length;

        return (
          <Card
            key={post.id}
            interactive
            className="p-3 cursor-pointer"
            onClick={() => onToggle(post.id)}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <div className="shrink-0 pt-0.5">
                <Checkbox checked={isSelected} />
              </div>

              {/* Image Thumbnail */}
              {thumbnailUrl && (
                <div className="relative shrink-0 w-14 h-14 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] overflow-hidden">
                  <img
                    src={getMediaSrc(thumbnailUrl)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  {/* Multiple images indicator */}
                  {imageCount > 1 && (
                    <div className="absolute bottom-0.5 right-0.5 flex items-center gap-0.5 px-1 py-0.5 bg-black/60 rounded text-white text-[10px] font-medium">
                      <Images className="h-2.5 w-2.5" />
                      {imageCount}
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--text-primary)] line-clamp-2">
                  {hasText ? (
                    <TelegramHtml content={post.text!} />
                  ) : (
                    <span className="italic text-[var(--text-tertiary)]">
                      {t("sources.mediaOnly")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                    <Eye className="h-3 w-3" />
                    {post.views.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* View full button */}
              {channelId && sourceId && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/channels/${channelId}/sources/${sourceId}/content/${post.id}`);
                  }}
                  className="shrink-0 p-2 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  title={t("sources.viewFull")}
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
