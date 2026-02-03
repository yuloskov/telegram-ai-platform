import { Clock, AlertCircle, Check, FileText, Eye, Calendar, Edit2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";

interface CalendarPost {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  skippedAt: string | null;
  contentPlanId: string | null;
  contentPlanName: string | null;
  mediaFiles?: { id: string; url: string; type: string }[];
}

interface CalendarPostCardProps {
  post: CalendarPost;
  onView: () => void;
  onEdit: () => void;
  onReschedule: () => void;
}

export function CalendarPostCard({ post, onView, onEdit, onReschedule }: CalendarPostCardProps) {
  const { t } = useI18n();

  const getStatusInfo = () => {
    if (post.skippedAt) {
      return {
        label: t("calendar.skipped"),
        color: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
        icon: AlertCircle,
      };
    }
    switch (post.status) {
      case "published":
        return {
          label: t("calendar.published"),
          color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
          icon: Check,
        };
      case "scheduled":
        return {
          label: t("calendar.scheduled"),
          color: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
          icon: Clock,
        };
      case "draft":
        return {
          label: t("calendar.draft"),
          color: "bg-slate-100 text-slate-700 dark:bg-slate-600/30 dark:text-slate-300",
          icon: FileText,
        };
      case "pending_review":
        return {
          label: t("calendar.pendingReview"),
          color: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
          icon: Eye,
        };
      case "failed":
        return {
          label: t("calendar.failed"),
          color: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
          icon: AlertCircle,
        };
      default:
        return {
          label: post.status,
          color: "bg-slate-100 text-slate-700 dark:bg-slate-600/30 dark:text-slate-300",
          icon: FileText,
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const getTimeDisplay = () => {
    const dateStr = post.publishedAt || post.scheduledAt || post.skippedAt;
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncatedContent =
    post.content.length > 120 ? post.content.slice(0, 120) + "..." : post.content;

  const showReschedule = post.skippedAt || post.status === "draft";
  const canEdit = ["draft", "failed", "scheduled", "pending_review"].includes(post.status);

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-secondary)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs", statusInfo.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
          {getTimeDisplay() && (
            <span className="text-xs text-[var(--text-tertiary)]">{getTimeDisplay()}</span>
          )}
        </div>
      </div>

      {/* Content preview */}
      <p className="text-sm text-[var(--text-primary)] mb-2 whitespace-pre-wrap">
        {truncatedContent}
      </p>

      {/* Content plan name */}
      {post.contentPlanName && (
        <p className="text-xs text-[var(--text-tertiary)] mb-2">
          Plan: {post.contentPlanName}
        </p>
      )}

      {/* Media preview */}
      {post.mediaFiles && post.mediaFiles.length > 0 && (
        <div className="flex gap-1 mb-2">
          {post.mediaFiles.slice(0, 3).map((media) => (
            <div
              key={media.id}
              className="w-12 h-12 rounded bg-[var(--bg-tertiary)] overflow-hidden"
            >
              <img
                src={media.url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {post.mediaFiles.length > 3 && (
            <div className="w-12 h-12 rounded bg-[var(--bg-tertiary)] flex items-center justify-center text-xs text-[var(--text-secondary)]">
              +{post.mediaFiles.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--border-secondary)]">
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="flex-1">
            <Edit2 className="h-4 w-4 mr-1" />
            {t("common.edit")}
          </Button>
        )}
        {!canEdit && (
          <Button variant="ghost" size="sm" onClick={onView} className="flex-1">
            <Eye className="h-4 w-4 mr-1" />
            {t("calendar.viewPost")}
          </Button>
        )}
        {showReschedule && (
          <Button variant="ghost" size="sm" onClick={onReschedule} className="flex-1">
            <Calendar className="h-4 w-4 mr-1" />
            {t("calendar.reschedule")}
          </Button>
        )}
      </div>
    </div>
  );
}
