import * as React from "react";
import { Badge } from "~/components/ui/badge";
import { useI18n } from "~/i18n";

type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed" | "pending_review";

interface StatusBadgeProps {
  status: PostStatus;
}

const statusVariants: Record<PostStatus, "default" | "primary" | "success" | "warning" | "error" | "info"> = {
  draft: "default",
  scheduled: "primary",
  publishing: "warning",
  published: "success",
  failed: "error",
  pending_review: "info",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();

  const getLabel = (status: PostStatus): string => {
    switch (status) {
      case "draft":
        return t("posts.status.draft");
      case "scheduled":
        return t("posts.status.scheduled");
      case "publishing":
        return t("posts.status.publishing");
      case "published":
        return t("posts.status.published");
      case "failed":
        return t("posts.status.failed");
      case "pending_review":
        return t("posts.status.pending_review");
      default:
        return t("posts.status.draft");
    }
  };

  const variant = statusVariants[status] || statusVariants.draft;
  return <Badge variant={variant}>{getLabel(status)}</Badge>;
}
