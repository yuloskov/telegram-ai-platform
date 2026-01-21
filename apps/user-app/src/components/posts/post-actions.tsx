// Action buttons for post detail page header

import { Send, RotateCcw, ExternalLink, Trash2, Edit2, Clock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";

interface PostActionsProps {
  canEdit: boolean;
  canPublish: boolean;
  canRetry: boolean;
  canDelete: boolean;
  canSchedule: boolean;
  isScheduled: boolean;
  telegramUrl: string | null;
  isPublishing: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onDelete: () => void;
  onSchedule: () => void;
}

export function PostActions({
  canEdit,
  canPublish,
  canRetry,
  canDelete,
  canSchedule,
  isScheduled,
  telegramUrl,
  isPublishing,
  onEdit,
  onPublish,
  onDelete,
  onSchedule,
}: PostActionsProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      {canEdit && (
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
          {t("common.edit")}
        </Button>
      )}
      {canSchedule && (
        <Button variant="secondary" size="sm" onClick={onSchedule}>
          <Clock className="h-4 w-4" />
          {isScheduled ? t("schedule.reschedule") : t("schedule.schedule")}
        </Button>
      )}
      {canPublish && (
        <Button size="sm" onClick={onPublish} disabled={isPublishing}>
          <Send className="h-4 w-4" />
          {t("posts.publish")}
        </Button>
      )}
      {canRetry && (
        <Button
          size="sm"
          variant="secondary"
          onClick={onPublish}
          disabled={isPublishing}
        >
          <RotateCcw className="h-4 w-4" />
          {t("common.retry")}
        </Button>
      )}
      {telegramUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(telegramUrl, "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
          {t("posts.openInTelegram")}
        </Button>
      )}
      {canDelete && (
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          {t("common.delete")}
        </Button>
      )}
    </div>
  );
}
