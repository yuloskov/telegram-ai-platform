import * as React from "react";
import { Badge } from "~/components/ui/badge";

type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed" | "pending_review";

interface StatusBadgeProps {
  status: PostStatus;
}

const statusConfig: Record<PostStatus, { label: string; variant: "default" | "primary" | "success" | "warning" | "error" | "info" }> = {
  draft: { label: "Draft", variant: "default" },
  scheduled: { label: "Scheduled", variant: "primary" },
  publishing: { label: "Publishing", variant: "warning" },
  published: { label: "Published", variant: "success" },
  failed: { label: "Failed", variant: "error" },
  pending_review: { label: "Pending Review", variant: "info" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
