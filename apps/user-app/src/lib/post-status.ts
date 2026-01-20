// Post status utilities - consolidated from post-list.tsx and post-detail page

import type { ReactNode } from "react";
import type { PostStatus } from "~/types";
import type { ChipProps } from "~/components/content/content-list-item";

// Translation function type that accepts any valid key
type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

// Status translation keys
const statusTranslationKeys: Record<PostStatus, string> = {
  draft: "posts.status.draft",
  scheduled: "posts.status.scheduled",
  publishing: "posts.status.publishing",
  published: "posts.status.published",
  failed: "posts.status.failed",
  pending_review: "posts.status.pending_review",
};

/**
 * Get the translated status label for a post status.
 */
export function getStatusLabel(
  status: PostStatus,
  t: TranslateFn
): string {
  const key = statusTranslationKeys[status] ?? statusTranslationKeys.draft;
  return t(key);
}

/**
 * Configuration for post status display (variant and icon).
 * Icons are passed in rather than created here to avoid dependency issues.
 */
export interface StatusConfigItem {
  variant: ChipProps["variant"];
  icon: ReactNode;
}

/**
 * Get the status chip configuration (variant and icon).
 * Pass icon components to avoid importing them here.
 */
export function getStatusConfig(
  status: PostStatus,
  icons: Record<PostStatus, ReactNode>
): StatusConfigItem {
  const variants: Record<PostStatus, ChipProps["variant"]> = {
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

/**
 * Create status icons object from icon components.
 * Use this in components to generate the icons map.
 */
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

/**
 * Build a chip configuration for a post status.
 */
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
