import { AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";

interface SkippedPostsBannerProps {
  count: number;
  onReschedule: () => void;
}

export function SkippedPostsBanner({ count, onReschedule }: SkippedPostsBannerProps) {
  const { t } = useI18n();

  if (count === 0) return null;

  return (
    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <p className="font-medium text-orange-800 dark:text-orange-200">
            {t("contentPlans.skippedPostsAlert", { count })}
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-400">
            These posts missed their scheduled time while the content plan was paused.
          </p>
        </div>
      </div>
      <Button variant="secondary" onClick={onReschedule}>
        {t("contentPlans.rescheduleSkipped")}
      </Button>
    </div>
  );
}
