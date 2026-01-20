import { useEffect } from "react";
import { useRouter } from "next/router";
import { FileText, CheckCircle } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { Checkbox } from "~/components/ui/checkbox";
import { EmptyState } from "~/components/telegram/empty-state";
import { EngagementMetrics } from "./engagement-metrics";
import { useContentSelectionStore } from "~/stores/content-selection-store";
import { useI18n } from "~/i18n";

interface ScrapedContent {
  id: string;
  telegramMessageId: string;
  text: string | null;
  mediaUrls: string[];
  views: number;
  forwards: number;
  reactions: number;
  scrapedAt: string;
  usedForGeneration: boolean;
}

interface ScrapedContentListProps {
  content: ScrapedContent[];
  isLoading: boolean;
  channelId: string;
  sourceId: string;
  selectionEnabled?: boolean;
}

export function ScrapedContentList({
  content,
  isLoading,
  channelId,
  sourceId,
  selectionEnabled = true,
}: ScrapedContentListProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { selectedIds, toggleSelection, selectAll, setSourceId, isSelected } =
    useContentSelectionStore();

  // Set source ID when component mounts or sourceId changes
  useEffect(() => {
    setSourceId(sourceId);
  }, [sourceId, setSourceId]);

  const handleClick = (contentId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox area
    if ((e.target as HTMLElement).closest('[data-checkbox]')) {
      return;
    }
    router.push(`/channels/${channelId}/sources/${sourceId}/content/${contentId}`);
  };

  const handleCheckboxClick = (e: React.MouseEvent, contentId: string) => {
    e.stopPropagation();
    toggleSelection(contentId);
  };

  const handleSelectAll = () => {
    const allIds = content.map((item) => item.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      // Clear selection if all are selected
      selectAll([]);
    } else {
      selectAll(allIds);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-8 flex items-center justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  if (content.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<FileText className="h-8 w-8 text-[var(--text-tertiary)]" />}
          title={t("sources.noContent")}
          description={t("sources.noContentDescription")}
        />
      </Card>
    );
  }

  const allIds = content.map((item) => item.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id));

  return (
    <div className="space-y-3">
      {/* Select All Header */}
      {selectionEnabled && content.length > 0 && (
        <div className="flex items-center gap-3 px-1 py-2">
          <Checkbox
            checked={allSelected}
            data-state={someSelected && !allSelected ? "indeterminate" : undefined}
            onCheckedChange={handleSelectAll}
            data-checkbox
          />
          <span className="text-sm text-[var(--text-secondary)]">
            {t("sources.selectAll")}
          </span>
        </div>
      )}

      {content.map((item) => (
        <Card
          key={item.id}
          interactive
          className="p-4 cursor-pointer"
          onClick={(e) => handleClick(item.id, e)}
        >
          <div className="flex items-start gap-4">
            {/* Checkbox */}
            {selectionEnabled && (
              <div
                data-checkbox
                className="shrink-0 pt-0.5"
                onClick={(e) => handleCheckboxClick(e, item.id)}
              >
                <Checkbox checked={isSelected(item.id)} />
              </div>
            )}

            {/* Image Thumbnail */}
            {item.mediaUrls.length > 0 &&
              item.mediaUrls[0] &&
              !item.mediaUrls[0].startsWith("skipped:") &&
              !item.mediaUrls[0].startsWith("failed:") && (
                <div className="shrink-0 w-16 h-16 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] overflow-hidden">
                  <img
                    src={`/api/media/${item.mediaUrls[0]}`}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-[var(--text-primary)] line-clamp-3">
                  {item.text || (
                    <span className="italic text-[var(--text-tertiary)]">
                      {t("sources.mediaOnly")}
                    </span>
                  )}
                </p>
                {item.usedForGeneration && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)]">
                    <CheckCircle className="h-3 w-3" />
                    {t("sources.usedBadge")}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <EngagementMetrics
                  views={item.views}
                  forwards={item.forwards}
                  reactions={item.reactions}
                />
                <span className="text-xs text-[var(--text-tertiary)]">
                  {new Date(item.scrapedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
