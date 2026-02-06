import { Badge, type BadgeVariant } from "~/components/ui/badge";
import { useI18n } from "~/i18n";

type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed" | "pending_review";

interface StatusBadgeProps {
  status: PostStatus;
}

const statusVariants: Record<PostStatus, BadgeVariant> = {
  draft: "default",
  scheduled: "info",
  publishing: "warning",
  published: "success",
  failed: "error",
  pending_review: "info",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();

  const labels: Record<PostStatus, string> = {
    draft: t("posts.status.draft"),
    scheduled: t("posts.status.scheduled"),
    publishing: t("posts.status.publishing"),
    published: t("posts.status.published"),
    failed: t("posts.status.failed"),
    pending_review: t("posts.status.pending_review"),
  };

  return (
    <Badge variant={statusVariants[status] ?? "default"}>
      {labels[status] ?? labels.draft}
    </Badge>
  );
}
