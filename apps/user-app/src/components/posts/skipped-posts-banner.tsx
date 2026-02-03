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
    <div className="bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-200 dark:bg-amber-800 rounded-full">
          <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-200" />
        </div>
        <div>
          <p className="font-medium text-amber-900 dark:text-amber-100">
            {t("contentPlans.skippedPostsAlert", { count })}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t("contentPlans.skippedPostsDescription")}
          </p>
        </div>
      </div>
      <Button variant="secondary" onClick={onReschedule}>
        {t("contentPlans.rescheduleSkipped")}
      </Button>
    </div>
  );
}
