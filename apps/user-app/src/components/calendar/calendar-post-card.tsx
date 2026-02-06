import { useState } from "react";
import { Clock, AlertCircle, Check, FileText, Eye, Calendar, Edit2, RefreshCw, Send } from "lucide-react";
import { Badge, type BadgeVariant } from "~/components/ui/badge";
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
  mediaFiles?: { id: string; url: string; type: string; isGenerated: boolean }[];
}

interface CalendarPostCardProps {
  post: CalendarPost;
  onView: () => void;
  onEdit: () => void;
  onReschedule: () => void;
  onRegenerate?: () => Promise<void>;
  onPublishNow?: () => Promise<void>;
}

interface StatusInfo {
  label: string;
  variant: BadgeVariant;
  icon: React.ElementType;
}

export function CalendarPostCard({ post, onView, onEdit, onReschedule, onRegenerate, onPublishNow }: CalendarPostCardProps) {
  const { t } = useI18n();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setIsRegenerating(false);
    }
  };

  const handlePublishNow = async () => {
    if (!onPublishNow) return;
    setIsPublishing(true);
    try {
      await onPublishNow();
    } finally {
      setIsPublishing(false);
    }
  };

  const getStatusInfo = (): StatusInfo => {
    if (post.skippedAt) {
      return { label: t("calendar.skipped"), variant: "warning", icon: AlertCircle };
    }
    switch (post.status) {
      case "published":
        return { label: t("calendar.published"), variant: "success", icon: Check };
      case "scheduled":
        return { label: t("calendar.scheduled"), variant: "info", icon: Clock };
      case "draft":
        return { label: t("calendar.draft"), variant: "default", icon: FileText };
      case "pending_review":
        return { label: t("calendar.pendingReview"), variant: "warning", icon: Eye };
      case "failed":
        return { label: t("calendar.failed"), variant: "error", icon: AlertCircle };
      default:
        return { label: post.status, variant: "default", icon: FileText };
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
  const canRegenerate = post.contentPlanId && ["draft", "scheduled", "pending_review"].includes(post.status);
  const canPublish = ["draft", "failed", "scheduled", "pending_review"].includes(post.status);

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-secondary)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={statusInfo.variant}
            icon={<StatusIcon className="h-3 w-3" />}
          >
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
      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-[var(--border-secondary)]">
        {canPublish && onPublishNow && (
          <Button
            variant="default"
            size="sm"
            onClick={handlePublishNow}
            disabled={isPublishing}
            className="text-xs px-2 h-7"
          >
            <Send className={cn("h-3.5 w-3.5 mr-1", isPublishing && "animate-pulse")} />
            {isPublishing ? t("posts.publishing") : t("posts.publishNow")}
          </Button>
        )}
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs px-2 h-7">
            <Edit2 className="h-3.5 w-3.5 mr-1" />
            {t("common.edit")}
          </Button>
        )}
        {!canEdit && (
          <Button variant="ghost" size="sm" onClick={onView} className="text-xs px-2 h-7">
            <Eye className="h-3.5 w-3.5 mr-1" />
            {t("calendar.viewPost")}
          </Button>
        )}
        {canRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="text-xs px-2 h-7"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isRegenerating && "animate-spin")} />
            {isRegenerating ? t("calendar.regenerating") : t("calendar.regenerate")}
          </Button>
        )}
        {showReschedule && (
          <Button variant="ghost" size="sm" onClick={onReschedule} className="text-xs px-2 h-7">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            {t("calendar.reschedule")}
          </Button>
        )}
      </div>
    </div>
  );
}
