import { Eye, Share2, Heart } from "lucide-react";
import { useI18n } from "~/i18n";

interface EngagementMetricsProps {
  views: number;
  forwards: number;
  reactions: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function EngagementMetrics({ views, forwards, reactions }: EngagementMetricsProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
      <span className="flex items-center gap-1" title={t("sources.views")}>
        <Eye className="h-3 w-3" />
        {formatNumber(views)}
      </span>
      <span className="flex items-center gap-1" title={t("sources.forwards")}>
        <Share2 className="h-3 w-3" />
        {formatNumber(forwards)}
      </span>
      <span className="flex items-center gap-1" title={t("sources.reactions")}>
        <Heart className="h-3 w-3" />
        {formatNumber(reactions)}
      </span>
    </div>
  );
}
