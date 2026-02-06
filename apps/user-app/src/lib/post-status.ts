import type { ReactNode } from "react";
import type { PostStatus } from "~/types";
import type { ChipProps } from "~/components/content/content-list-item";
import type { BadgeVariant } from "~/components/ui/badge";

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const statusTranslationKeys: Record<PostStatus, string> = {
  draft: "posts.status.draft",
  scheduled: "posts.status.scheduled",
  publishing: "posts.status.publishing",
  published: "posts.status.published",
  failed: "posts.status.failed",
  pending_review: "posts.status.pending_review",
};

export function getStatusLabel(
  status: PostStatus,
  t: TranslateFn
): string {
  const key = statusTranslationKeys[status] ?? statusTranslationKeys.draft;
  return t(key);
}

export interface StatusConfigItem {
  variant: BadgeVariant;
  icon: ReactNode;
}

export function getStatusConfig(
  status: PostStatus,
  icons: Record<PostStatus, ReactNode>
): StatusConfigItem {
  const variants: Record<PostStatus, BadgeVariant> = {
    draft: "default",
    scheduled: "info",
    publishing: "warning",
    published: "success",
    failed: "error",
    pending_review: "info",
  };

  return {
    variant: variants[status] ?? variants.draft,
    icon: icons[status] ?? null,
  };
}

export function createStatusIcons(components: {
  Clock: ReactNode;
  Loader: ReactNode;
  CheckCircle: ReactNode;
  AlertCircle: ReactNode;
  Send: ReactNode;
}): Record<PostStatus, ReactNode> {
  return {
    draft: null,
    scheduled: components.Clock,
    publishing: components.Loader,
    published: components.CheckCircle,
    failed: components.AlertCircle,
    pending_review: components.Send,
  };
}

export function buildStatusChip(
  status: PostStatus,
  t: TranslateFn,
  icons: Record<PostStatus, ReactNode>
): ChipProps {
  const config = getStatusConfig(status, icons);
  return {
    label: getStatusLabel(status, t),
    icon: config.icon,
    variant: config.variant,
  };
}
