import type { ReactNode } from "react";
import { Eye, Share2, Heart, Calendar, Send, Clock } from "lucide-react";
import { useI18n } from "~/i18n";

interface MetricItem {
  icon: ReactNode;
  value: string | number;
  title?: string;
}

interface ContentMetricsProps {
  items: MetricItem[];
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContentMetrics({ items }: ContentMetricsProps) {
  return (
    <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
      {items.map((item, idx) => (
        <span
          key={idx}
          className="flex items-center gap-1"
          title={item.title}
        >
          {item.icon}
          {typeof item.value === "number" ? formatNumber(item.value) : item.value}
        </span>
      ))}
    </div>
  );
}

// Pre-built metric factories for common use cases
interface EngagementMetricsProps {
  views: number;
  forwards: number;
  reactions: number;
}

export function EngagementMetrics({ views, forwards, reactions }: EngagementMetricsProps) {
  const { t } = useI18n();

  return (
    <ContentMetrics
      items={[
        { icon: <Eye className="h-3 w-3" />, value: views, title: t("sources.views") },
        { icon: <Share2 className="h-3 w-3" />, value: forwards, title: t("sources.forwards") },
        { icon: <Heart className="h-3 w-3" />, value: reactions, title: t("sources.reactions") },
      ]}
    />
  );
}

interface PostMetricsProps {
  createdAt: string;
  publishedAt?: string | null;
  scheduledAt?: string | null;
}

export function PostMetrics({ createdAt, publishedAt, scheduledAt }: PostMetricsProps) {
  const { t } = useI18n();

  const items: MetricItem[] = [
    { icon: <Calendar className="h-3 w-3" />, value: formatDate(createdAt), title: t("posts.created") },
  ];

  if (publishedAt) {
    items.push({ icon: <Send className="h-3 w-3" />, value: formatDate(publishedAt), title: t("posts.published") });
  }

  if (scheduledAt) {
    items.push({ icon: <Clock className="h-3 w-3" />, value: formatDate(scheduledAt), title: t("posts.scheduled") });
  }

  return <ContentMetrics items={items} />;
}
