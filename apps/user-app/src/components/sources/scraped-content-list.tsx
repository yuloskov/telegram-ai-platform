import { FileText, CheckCircle } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { EmptyState } from "~/components/telegram/empty-state";
import { EngagementMetrics } from "./engagement-metrics";
import { useI18n } from "~/i18n";

interface ScrapedContent {
  id: string;
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
}

export function ScrapedContentList({ content, isLoading }: ScrapedContentListProps) {
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

  return (
    <div className="space-y-3">
      {content.map((item) => (
        <Card key={item.id} interactive className="p-4">
          <div className="flex items-start gap-4">
            {item.mediaUrls.length > 0 && (
              <div className="shrink-0 w-16 h-16 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] overflow-hidden">
                <img
                  src={item.mediaUrls[0]}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-[var(--text-primary)] line-clamp-3">
                  {item.text || <span className="italic text-[var(--text-tertiary)]">Media only</span>}
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
