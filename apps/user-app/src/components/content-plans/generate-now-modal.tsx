import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Zap, Calendar, AlertCircle } from "lucide-react";
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

interface GenerateNowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  onSuccess?: (postCount: number) => void;
}

async function previewSchedule(planId: string, count: number) {
  const res = await fetch(`/api/content-plans/${planId}/preview-schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
  if (!res.ok) throw new Error("Failed to preview schedule");
  const data = await res.json();
  return data.data as { scheduledTimes: string[]; cronSchedule: string; timezone: string };
}

async function generateNow(planId: string, count: number) {
  const res = await fetch(`/api/content-plans/${planId}/generate-now`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate posts");
  }
  const data = await res.json();
  return data.data as { posts: Array<{ id: string }>; scheduledTimes: string[] };
}

export function GenerateNowModal({
  open,
  onOpenChange,
  planId,
  planName,
  onSuccess,
}: GenerateNowModalProps) {
  const { t } = useI18n();
  const [count, setCount] = useState(3);

  const {
    data: preview,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useQuery({
    queryKey: ["preview-schedule", planId, count],
    queryFn: () => previewSchedule(planId, count),
    enabled: open,
    staleTime: 30000,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateNow(planId, count),
    onSuccess: (data) => {
      onOpenChange(false);
      onSuccess?.(data.posts.length);
    },
  });

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 10) {
      setCount(value);
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
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
            <Zap className="h-5 w-5 text-[var(--accent-primary)]" />
            {t("contentPlans.generateNowTitle")}
          </ModalTitle>
          <ModalDescription>
            {t("contentPlans.generateNowDescription")}
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4">
          {/* Plan name */}
          <div className="text-sm text-[var(--text-secondary)]">
            Plan: <span className="font-medium text-[var(--text-primary)]">{planName}</span>
          </div>

          {/* Post count input */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t("contentPlans.postsToGenerate")}
            </label>
            <Input
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={handleCountChange}
              className="w-24"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              1-10 posts
            </p>
          </div>

          {/* Schedule preview */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {t("contentPlans.scheduledFor")}
            </label>
            <div className="bg-[var(--bg-secondary)] rounded-lg p-3 max-h-48 overflow-y-auto">
              {isPreviewLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                </div>
              ) : previewError ? (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Failed to load schedule preview
                </div>
              ) : preview ? (
                <ul className="space-y-2">
                  {preview.scheduledTimes.map((time, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
                      <span className="text-[var(--text-primary)]">
                        Post {index + 1}:
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        {formatDateTime(time)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {/* Error message */}
          {generateMutation.error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {generateMutation.error instanceof Error
                ? generateMutation.error.message
                : t("contentPlans.generateError")}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || isPreviewLoading}
          >
            {generateMutation.isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {t("contentPlans.generating")}
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                {t("contentPlans.generateNow")}
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
