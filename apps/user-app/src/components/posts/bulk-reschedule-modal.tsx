import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calendar, AlertCircle, Clock } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "~/components/ui/modal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { useI18n } from "~/i18n";

interface BulkRescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postIds: string[];
  onSuccess?: (count: number) => void;
}

async function bulkReschedule(
  postIds: string[],
  startDate: string,
  intervalMinutes?: number
) {
  const res = await fetch("/api/posts/bulk-reschedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postIds, startDate, intervalMinutes }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to reschedule posts");
  }
  const data = await res.json();
  return data.data as { posts: Array<{ id: string; scheduledAt: string }>; rescheduledCount: number };
}

export function BulkRescheduleModal({
  open,
  onOpenChange,
  postIds,
  onSuccess,
}: BulkRescheduleModalProps) {
  const { t } = useI18n();

  // Default to 1 hour from now
  const defaultStartDate = useMemo(() => {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    date.setMinutes(0);
    date.setSeconds(0);
    return date.toISOString().slice(0, 16);
  }, []);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [intervalMinutes, setIntervalMinutes] = useState(60);

  const rescheduleMutation = useMutation({
    mutationFn: () => bulkReschedule(postIds, startDate, intervalMinutes),
    onSuccess: (data) => {
      onOpenChange(false);
      onSuccess?.(data.rescheduledCount);
    },
  });

  // Calculate preview of new schedule
  const schedulePreview = useMemo(() => {
    if (!startDate) return [];
    const start = new Date(startDate);
    return postIds.map((_, index) => {
      const postDate = new Date(start.getTime() + index * intervalMinutes * 60 * 1000);
      return postDate;
    });
  }, [startDate, intervalMinutes, postIds]);

  const formatDateTime = (date: Date) => {
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[var(--accent-primary)]" />
            {t("reschedule.bulkTitle", { count: postIds.length })}
          </ModalTitle>
          <ModalDescription>
            Reschedule {postIds.length} posts to new times.
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4">
          {/* Start date picker */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t("reschedule.startDate")}
            </label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* Interval input */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t("reschedule.intervalMinutes")}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={1440}
                value={intervalMinutes}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1) {
                    setIntervalMinutes(val);
                  }
                }}
                className="w-24"
              />
              <span className="text-sm text-[var(--text-secondary)]">minutes</span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {intervalMinutes >= 60
                ? `${Math.floor(intervalMinutes / 60)}h ${intervalMinutes % 60}m between posts`
                : `${intervalMinutes}m between posts`}
            </p>
          </div>

          {/* Schedule preview */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {t("reschedule.preview")}
            </label>
            <div className="bg-[var(--bg-secondary)] rounded-lg p-3 max-h-48 overflow-y-auto">
              <ul className="space-y-2">
                {schedulePreview.map((date, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />
                    <span className="text-[var(--text-primary)]">
                      Post {index + 1}:
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {formatDateTime(date)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Error message */}
          {rescheduleMutation.error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {rescheduleMutation.error instanceof Error
                ? rescheduleMutation.error.message
                : t("reschedule.error")}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => rescheduleMutation.mutate()}
            disabled={rescheduleMutation.isPending || !startDate}
          >
            {rescheduleMutation.isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {t("reschedule.rescheduling")}
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                {t("reschedule.confirm")}
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
