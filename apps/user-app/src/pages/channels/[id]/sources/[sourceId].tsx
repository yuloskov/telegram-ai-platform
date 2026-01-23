import { useRouter } from "next/router";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { useSourceDetail } from "~/hooks/useSourceDetail";
import { AppHeader } from "~/components/layout/header";
import { PageLayout } from "~/components/layout/page-layout";
import { Spinner } from "~/components/ui/spinner";
import { TelegramSourceDetail } from "~/components/sources/telegram-source-detail";
import { DocumentSourceDetail } from "~/components/sources/document-source-detail";
import { useI18n } from "~/i18n";

export default function SourceDetailPage() {
  const router = useRouter();
  const { id: channelId, sourceId } = router.query;
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const sourceDetail = useSourceDetail(
    channelId as string,
    sourceId as string,
    authLoading
  );

  const { channel, source, isLoading } = sourceDetail;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!channel || !source) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <p className="text-[var(--text-secondary)]">{t("channels.notFound")}</p>
      </div>
    );
  }

  const pageTitle =
    source.sourceType === "document"
      ? source.documentName ?? t("sources.document")
      : `@${source.telegramUsername}`;

  return (
    <PageLayout title={`${pageTitle} - ${channel.title}`}>
      <AppHeader user={user} onLogout={logout} />

      {source.sourceType === "document" ? (
        <DocumentSourceDetail
          channel={channel}
          channelId={channelId as string}
          sourceId={sourceId as string}
          sourceDetail={sourceDetail}
        />
      ) : (
        <TelegramSourceDetail
          channel={channel}
          channelId={channelId as string}
          sourceId={sourceId as string}
          sourceDetail={sourceDetail}
        />
      )}
    </PageLayout>
  );
}
