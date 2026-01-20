import { useEffect } from "react";
import { useRouter } from "next/router";
import { CheckCircle } from "lucide-react";
import { ContentList } from "~/components/content/content-list";
import { ContentListItem, type ChipProps } from "~/components/content/content-list-item";
import { EngagementMetrics } from "~/components/content/content-metrics";
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

  useEffect(() => {
    setSourceId(sourceId);
  }, [sourceId, setSourceId]);

  const handleClick = (contentId: string) => {
    router.push(`/channels/${channelId}/sources/${sourceId}/content/${contentId}`);
  };

  const itemIds = content.map((item) => item.id);

  return (
    <ContentList
      itemIds={itemIds}
      selectedIds={selectedIds}
      isLoading={isLoading}
      selectionEnabled={selectionEnabled}
      emptyTitle={t("sources.noContent")}
      emptyDescription={t("sources.noContentDescription")}
      onSelectAll={selectAll}
    >
      {content.map((item) => {
        const chips: ChipProps[] = [];
        if (item.usedForGeneration) {
          chips.push({
            label: t("sources.usedBadge"),
            icon: <CheckCircle className="h-3 w-3" />,
            variant: "info",
          });
        }

        // Count valid images (not skipped)
        const validImageUrls = item.mediaUrls.filter(
          (url) => !url.startsWith("skipped:") && !url.startsWith("failed:")
        );
        const firstValidImage = validImageUrls[0] ?? item.mediaUrls[0];

        return (
          <ContentListItem
            key={item.id}
            id={item.id}
            text={item.text}
            thumbnailUrl={firstValidImage}
            imageCount={validImageUrls.length}
            chips={chips}
            metrics={
              <EngagementMetrics
                views={item.views}
                forwards={item.forwards}
                reactions={item.reactions}
              />
            }
            date={item.scrapedAt}
            selected={isSelected(item.id)}
            selectionEnabled={selectionEnabled}
            onSelect={toggleSelection}
            onClick={handleClick}
          />
        );
      })}
    </ContentList>
  );
}
