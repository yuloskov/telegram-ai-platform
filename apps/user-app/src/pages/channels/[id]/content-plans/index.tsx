import { useState } from "react";
import { useRouter } from "next/router";
import { Plus, Calendar } from "lucide-react";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { useChannel } from "~/hooks/useChannel";
import {
  useContentPlans,
  useToggleContentPlan,
  useDeleteContentPlan,
} from "~/hooks/useContentPlan";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { ConfirmModal } from "~/components/ui/confirm-modal";
import { ContentPlanCard } from "~/components/content-plans/content-plan-card";
import { useI18n } from "~/i18n";

export default function ContentPlansPage() {
  const router = useRouter();
  const { id: channelId } = router.query;
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: channel, isLoading: channelLoading } = useChannel(
    channelId as string,
    { enabled: !authLoading }
  );

  const { data: plans, isLoading: plansLoading } = useContentPlans(
    channelId as string,
    { enabled: !authLoading && !!channelId }
  );

  const toggleMutation = useToggleContentPlan(channelId as string);
  const deleteMutation = useDeleteContentPlan(channelId as string);

  if (authLoading || channelLoading) {
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

  const contentPlans = plans ?? [];

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  return (
    <PageLayout title={`${t("contentPlans.title")} - ${channel.title}`}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        <PageHeader
          title={t("contentPlans.title")}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title, href: `/channels/${channelId}` },
            { label: t("contentPlans.title") },
          ]}
          actions={
            <Button onClick={() => router.push(`/channels/${channelId}/content-plans/new`)}>
              <Plus className="h-4 w-4" />
              {t("contentPlans.createPlan")}
            </Button>
          }
        />

        <p className="text-sm text-[var(--text-secondary)] -mt-4 mb-6">
          {t("contentPlans.description")}
        </p>

        <PageSection>
          {plansLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : contentPlans.length === 0 ? (
            <EmptyState
              onCreateClick={() => router.push(`/channels/${channelId}/content-plans/new`)}
            />
          ) : (
            <div className="space-y-3">
              {contentPlans.map((plan) => (
                <ContentPlanCard
                  key={plan.id}
                  plan={plan}
                  channelId={channelId as string}
                  onToggle={(id) => toggleMutation.mutate(id)}
                  onDelete={(id) => setDeleteTarget(id)}
                  isToggling={toggleMutation.isPending}
                />
              ))}
            </div>
          )}
        </PageSection>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("contentPlans.deleteConfirmTitle")}
        description={t("contentPlans.deleteConfirmDescription")}
        confirmLabel={t("common.delete")}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </PageLayout>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  const { t } = useI18n();

  return (
    <div className="text-center py-12">
      <Calendar className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
        {t("contentPlans.noPlan")}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        {t("contentPlans.noPlanDescription")}
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4" />
        {t("contentPlans.createPlan")}
      </Button>
    </div>
  );
}
