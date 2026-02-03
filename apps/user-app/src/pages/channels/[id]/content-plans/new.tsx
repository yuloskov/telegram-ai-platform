import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { useChannel } from "~/hooks/useChannel";
import { useCreateContentPlan } from "~/hooks/useContentPlan";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Spinner } from "~/components/ui/spinner";
import { ContentPlanForm } from "~/components/content-plans/content-plan-form";
import { useI18n } from "~/i18n";

interface ContentSource {
  id: string;
  sourceType: "telegram" | "document" | "webpage";
  telegramUsername: string | null;
  documentName: string | null;
  webpageTitle: string | null;
  webpageDomain: string | null;
}

export default function NewContentPlanPage() {
  const router = useRouter();
  const { id: channelId } = router.query;
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const { data: channel, isLoading: channelLoading } = useChannel(
    channelId as string,
    { enabled: !authLoading }
  );

  // Fetch available content sources
  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ["sources", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources`);
      const json = await res.json();
      return json.data as ContentSource[];
    },
    enabled: !!channelId && !authLoading,
  });

  const createMutation = useCreateContentPlan(channelId as string);

  if (authLoading || channelLoading || sourcesLoading) {
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

  const sources = sourcesData ?? [];

  return (
    <PageLayout title={`${t("contentPlans.createPlan")} - ${channel.title}`}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
        <PageHeader
          title={t("contentPlans.createPlan")}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title, href: `/channels/${channelId}` },
            { label: t("contentPlans.title"), href: `/channels/${channelId}/content-plans` },
            { label: t("contentPlans.createPlan") },
          ]}
        />

        <PageSection>
          <ContentPlanForm
            availableSources={sources}
            onSubmit={(data) => {
              createMutation.mutate(data, {
                onSuccess: () => {
                  router.push(`/channels/${channelId}/content-plans`);
                },
              });
            }}
            isSubmitting={createMutation.isPending}
            submitLabel={t("contentPlans.createPlan")}
          />
        </PageSection>
      </div>
    </PageLayout>
  );
}
