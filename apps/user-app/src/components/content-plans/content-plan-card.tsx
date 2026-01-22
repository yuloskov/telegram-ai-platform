// Card component for displaying a content plan in a list

import { useRouter } from "next/router";
import { Play, Pause, Trash2, ChevronRight, Calendar, Clock, Timer } from "lucide-react";
import { CronExpressionParser } from "cron-parser";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { useI18n, type Language } from "~/i18n";
import { cronToHumanReadable } from "./cron-schedule-picker";
import type { ContentPlan } from "~/hooks/useContentPlan";

function getNextRunFromCron(cronSchedule: string, timezone: string): Date | null {
  try {
    const interval = CronExpressionParser.parse(cronSchedule, {
      tz: timezone,
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

function formatNextRunTime(nextDate: Date | null, language: Language): string | null {
  if (!nextDate) return null;

  const now = new Date();
  const diffMs = nextDate.getTime() - now.getTime();

  if (diffMs < 0) return null;

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return language === "ru" ? `через ${diffMinutes} мин` : `in ${diffMinutes}m`;
  }
  if (diffHours < 24) {
    const mins = diffMinutes % 60;
    return language === "ru"
      ? `через ${diffHours}ч ${mins}м`
      : `in ${diffHours}h ${mins}m`;
  }
  if (diffDays < 7) {
    return language === "ru" ? `через ${diffDays} дн.` : `in ${diffDays}d`;
  }

  // For longer periods, show the date
  return nextDate.toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ContentPlanCardProps {
  plan: ContentPlan;
  channelId: string;
  onToggle: (planId: string) => void;
  onDelete: (planId: string) => void;
  isToggling?: boolean;
}

export function ContentPlanCard({
  plan,
  channelId,
  onToggle,
  onDelete,
  isToggling = false,
}: ContentPlanCardProps) {
  const { t, language } = useI18n();
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/channels/${channelId}/content-plans/${plan.id}/edit`);
  };

  const scheduleDisplay = cronToHumanReadable(plan.cronSchedule, t);

  // Calculate next run directly from cron expression (more reliable than BullMQ's potentially stale value)
  const nextRunDate = plan.isEnabled ? getNextRunFromCron(plan.cronSchedule, plan.timezone) : null;
  const nextRunDisplay = formatNextRunTime(nextRunDate, language);

  return (
    <Card interactive className="p-4 cursor-pointer" onClick={handleCardClick}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {plan.name}
            </span>
            <Badge variant={plan.isEnabled ? "success" : "default"}>
              {plan.isEnabled
                ? t("contentPlans.status.active")
                : t("contentPlans.status.paused")}
            </Badge>
            {nextRunDisplay && (
              <span className="flex items-center gap-1 text-xs text-[var(--accent-primary)]">
                <Timer className="h-3 w-3" />
                {nextRunDisplay}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {scheduleDisplay}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {plan.timezone}
            </span>
            {plan.contentSources.length > 0 && (
              <span>
                {t("contentPlans.sourcesSelectedCount", {
                  count: plan.contentSources.length,
                })}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-1">
            {plan.promptTemplate}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(plan.id);
            }}
            disabled={isToggling}
          >
            {plan.isEnabled ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                {t("contentPlans.pause")}
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                {t("contentPlans.resume")}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(plan.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
        </div>
      </div>
    </Card>
  );
}
