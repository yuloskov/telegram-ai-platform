// Stats card for source detail page

import { Card } from "~/components/ui/card";
import { useI18n } from "~/i18n";

interface SourceStatsCardProps {
  scrapedCount: number;
  lastScrapedAt: string | null;
}

export function SourceStatsCard({ scrapedCount, lastScrapedAt }: SourceStatsCardProps) {
  const { t } = useI18n();

  return (
    <Card className="mb-6">
      <div className="p-4 flex items-center gap-6">
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">{t("sources.posts")}</p>
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {scrapedCount}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">{t("sources.lastScraped")}</p>
          <p className="text-sm text-[var(--text-primary)]">
            {lastScrapedAt
              ? new Date(lastScrapedAt).toLocaleString()
              : t("sources.neverScraped")}
          </p>
        </div>
      </div>
    </Card>
  );
}
