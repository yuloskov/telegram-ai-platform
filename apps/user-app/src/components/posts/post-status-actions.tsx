import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clock, FileText, Eye, ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ScheduleModal } from "./schedule-modal";
import { useI18n } from "~/i18n";

type PostStatus = "draft" | "scheduled" | "pending_review" | "failed";

interface PostStatusActionsProps {
  postId: string;
  currentStatus: string;
  scheduledAt: string | null;
  onStatusChange: () => void;
  compact?: boolean;
}

export function PostStatusActions({
  postId,
  currentStatus,
  scheduledAt,
  onStatusChange,
  compact = false,
}: PostStatusActionsProps) {
  const { t } = useI18n();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, scheduledAt }: { status?: string; scheduledAt?: string | null }) => {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, scheduledAt }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      onStatusChange();
      setShowStatusMenu(false);
    },
  });

  const handleSchedule = (date: Date) => {
    updateStatusMutation.mutate({
      status: "scheduled",
      scheduledAt: date.toISOString(),
    });
    setShowScheduleModal(false);
  };

  const handleUnschedule = () => {
    updateStatusMutation.mutate({
      status: "draft",
      scheduledAt: null,
    });
    setShowScheduleModal(false);
  };

  const handleSetStatus = (status: PostStatus) => {
    if (status === "scheduled") {
      setShowScheduleModal(true);
    } else {
      updateStatusMutation.mutate({ status, scheduledAt: null });
    }
  };

  const isLoading = updateStatusMutation.isPending;
  const canEdit = ["draft", "failed", "scheduled", "pending_review"].includes(currentStatus);

  if (!canEdit) return null;

  const statusOptions: { status: PostStatus; label: string; icon: React.ReactNode }[] = [
    { status: "draft", label: t("calendar.draft"), icon: <FileText className="h-4 w-4" /> },
    { status: "pending_review", label: t("calendar.pendingReview"), icon: <Eye className="h-4 w-4" /> },
    { status: "scheduled", label: t("calendar.scheduled"), icon: <Clock className="h-4 w-4" /> },
  ];

  if (compact) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              disabled={isLoading}
            >
              {t("posts.changeStatus")}
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
            {showStatusMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowStatusMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-[var(--radius-md)] shadow-lg py-1 min-w-[160px]">
                  {statusOptions
                    .filter((opt) => opt.status !== currentStatus)
                    .map((opt) => (
                      <button
                        key={opt.status}
                        onClick={() => handleSetStatus(opt.status)}
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>

        <ScheduleModal
          open={showScheduleModal}
          onOpenChange={setShowScheduleModal}
          currentScheduledAt={scheduledAt ? new Date(scheduledAt) : null}
          onSchedule={handleSchedule}
          onUnschedule={handleUnschedule}
          isLoading={updateStatusMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {currentStatus !== "scheduled" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowScheduleModal(true)}
            disabled={isLoading}
          >
            <Clock className="h-4 w-4" />
            {t("posts.schedule")}
          </Button>
        )}

        {currentStatus !== "pending_review" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleSetStatus("pending_review")}
            disabled={isLoading}
          >
            <Eye className="h-4 w-4" />
            {t("posts.sendToReview")}
          </Button>
        )}

        {currentStatus !== "draft" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleSetStatus("draft")}
            disabled={isLoading}
          >
            <FileText className="h-4 w-4" />
            {t("posts.moveToDraft")}
          </Button>
        )}
      </div>

      <ScheduleModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        currentScheduledAt={scheduledAt ? new Date(scheduledAt) : null}
        onSchedule={handleSchedule}
        onUnschedule={handleUnschedule}
        isLoading={updateStatusMutation.isPending}
      />
    </div>
  );
}
