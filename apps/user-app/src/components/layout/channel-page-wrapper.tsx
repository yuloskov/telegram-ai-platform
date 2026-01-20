// Wrapper component for channel pages - eliminates ~72 lines duplicated across 6 pages
// Handles auth loading, channel loading, and not-found states

import type { ReactNode } from "react";
import { Spinner } from "~/components/ui/spinner";
import { useI18n } from "~/i18n";

interface ChannelPageWrapperProps {
  /** Is authentication still loading */
  isAuthLoading: boolean;
  /** Is channel data still loading */
  isChannelLoading: boolean;
  /** The loaded channel data (null if not found) */
  channel: unknown | null | undefined;
  /** Page content to render when everything is ready */
  children: ReactNode;
}

/**
 * Wrapper that handles the common loading and not-found states for channel pages.
 * Use this in combination with useChannel hook to avoid duplicated loading logic.
 *
 * @example
 * ```tsx
 * function ChannelPage() {
 *   const { id } = useRouter().query;
 *   const { isLoading: authLoading } = useRequireAuth();
 *   const { data: channel, isLoading: channelLoading } = useChannel(id, { enabled: !authLoading });
 *
 *   return (
 *     <ChannelPageWrapper
 *       isAuthLoading={authLoading}
 *       isChannelLoading={channelLoading}
 *       channel={channel}
 *     >
 *       <PageContent channel={channel!} />
 *     </ChannelPageWrapper>
 *   );
 * }
 * ```
 */
export function ChannelPageWrapper({
  isAuthLoading,
  isChannelLoading,
  channel,
  children,
}: ChannelPageWrapperProps) {
  const { t } = useI18n();

  if (isAuthLoading || isChannelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <p className="text-[var(--text-secondary)]">{t("channels.notFound")}</p>
      </div>
    );
  }

  return <>{children}</>;
}

interface ResourcePageWrapperProps extends Omit<ChannelPageWrapperProps, "channel"> {
  /** The loaded resource data (null if not found) */
  resource: unknown | null | undefined;
  /** The loaded channel data */
  channel: unknown | null | undefined;
  /** Is resource data still loading */
  isResourceLoading?: boolean;
}

/**
 * Wrapper for pages that have both a channel and another resource (e.g., post detail, source detail).
 * Handles auth, channel, and resource loading states.
 */
export function ResourcePageWrapper({
  isAuthLoading,
  isChannelLoading,
  isResourceLoading,
  channel,
  resource,
  children,
}: ResourcePageWrapperProps) {
  const { t } = useI18n();

  if (isAuthLoading || isChannelLoading || isResourceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!channel || !resource) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <p className="text-[var(--text-secondary)]">{t("common.notFound")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
