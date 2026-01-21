import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "~/components/ui/modal";
import { Button } from "~/components/ui/button";
import { DateTimePicker } from "~/components/ui/date-time-picker";
import { useI18n } from "~/i18n";

interface ScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentScheduledAt: Date | null;
  onSchedule: (scheduledAt: Date) => void;
  onUnschedule: () => void;
  isLoading: boolean;
  /** Number of posts being scheduled (for bulk scheduling). If > 1, shows bulk title. */
  postCount?: number;
}

export function ScheduleModal({
  open,
  onOpenChange,
  currentScheduledAt,
  onSchedule,
  onUnschedule,
  isLoading,
  postCount = 1,
}: ScheduleModalProps) {
  const { t } = useI18n();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Initialize with current scheduled time or 1 hour from now
  useEffect(() => {
    if (open) {
      if (currentScheduledAt) {
        setSelectedDate(new Date(currentScheduledAt));
      } else {
        const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
        setSelectedDate(oneHourFromNow);
      }
    }
  }, [open, currentScheduledAt]);

  const isRescheduling = currentScheduledAt !== null;
  const isBulk = postCount > 1;
  const minDate = new Date(Date.now() + 60 * 1000); // 1 minute from now

  const handleSchedule = () => {
    if (selectedDate && selectedDate > minDate) {
      onSchedule(selectedDate);
    }
  };

  const formatCurrentSchedule = (date: Date) => {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {isBulk
              ? t("schedule.bulkTitle", { count: postCount })
              : isRescheduling
                ? t("schedule.rescheduleTitle")
                : t("schedule.title")}
          </ModalTitle>
          <ModalDescription>
            {isBulk
              ? t("schedule.bulkDescription", { count: postCount })
              : t("schedule.description")}
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4">
          {isRescheduling && currentScheduledAt && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-3 rounded-[var(--radius-md)]">
              <Calendar className="h-4 w-4" />
              <span>
                {t("schedule.currentlyScheduled")}: {formatCurrentSchedule(currentScheduledAt)}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t("schedule.scheduledFor")}
            </label>
            <DateTimePicker
              value={selectedDate}
              onChange={setSelectedDate}
              minDate={minDate}
            />
          </div>
        </div>

        <ModalFooter>
          {isRescheduling && (
            <Button
              variant="ghost"
              onClick={onUnschedule}
              disabled={isLoading}
            >
              {t("schedule.unschedule")}
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isLoading || !selectedDate || selectedDate <= minDate}
          >
            {isLoading ? t("schedule.scheduling") : t("schedule.confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
