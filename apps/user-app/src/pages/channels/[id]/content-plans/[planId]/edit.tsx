import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { Timer } from "lucide-react";
import { CronExpressionParser } from "cron-parser";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { useChannel } from "~/hooks/useChannel";
import { useContentPlan, useUpdateContentPlan } from "~/hooks/useContentPlan";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Spinner } from "~/components/ui/spinner";
import { Badge } from "~/components/ui/badge";
import { ContentPlanForm } from "~/components/content-plans/content-plan-form";
import { useI18n, type Language } from "~/i18n";

function getNextRunFromCron(cronSchedule: string, timezone: string): Date | null {
  try {
    const interval = CronExpressionParser.parse(cronSchedule, { tz: timezone });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

function formatNextRunTime(nextDate: Date | null, language: Language): string | null {
  if (!nextDate) return null;

  const now = new Date();
  const diffMs = nextDate.getTime() - now.getTime();

  if (diffMs < 0) return null;

  // Show full date and time
  return nextDate.toLocaleString(language === "ru" ? "ru-RU" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ContentSource {
  id: string;
  sourceType: "telegram" | "document" | "webpage" | "website";
  telegramUsername: string | null;
  documentName: string | null;
  webpageTitle: string | null;
  webpageDomain: string | null;
  websiteTitle: string | null;
  websiteDomain: string | null;
}

export default function EditContentPlanPage() {
  const router = useRouter();
  const { id: channelId, planId } = router.query;
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t, language } = useI18n();

  const { data: channel, isLoading: channelLoading } = useChannel(
    channelId as string,
    { enabled: !authLoading }
  );

  const { data: plan, isLoading: planLoading } = useContentPlan(
    channelId as string,
    planId as string,
    { enabled: !authLoading && !!channelId && !!planId }
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

  const updateMutation = useUpdateContentPlan(channelId as string, planId as string);

  if (authLoading || channelLoading || planLoading || sourcesLoading) {
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

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <p className="text-[var(--text-secondary)]">{t("common.notFound")}</p>
      </div>
    );
  }

  const sources = sourcesData ?? [];
  const nextRunDate = plan.isEnabled ? getNextRunFromCron(plan.cronSchedule, plan.timezone) : null;
  const nextRunDisplay = formatNextRunTime(nextRunDate, language);

  return (
    <PageLayout title={`${t("contentPlans.editPlan")} - ${plan.name}`}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
        <PageHeader
          title={t("contentPlans.editPlan")}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title, href: `/channels/${channelId}` },
            { label: t("contentPlans.title"), href: `/channels/${channelId}/content-plans` },
            { label: plan.name },
          ]}
        />

        {/* Status info */}
        <div className="mb-6 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Badge variant={plan.isEnabled ? "success" : "default"}>
                {plan.isEnabled
                  ? t("contentPlans.status.active")
                  : t("contentPlans.status.paused")}
              </Badge>
              {nextRunDisplay && (
                <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Timer className="h-4 w-4 text-[var(--accent-primary)]" />
                  <span className="text-[var(--text-tertiary)]">{t("contentPlans.nextRun")}:</span>
                  <span className="font-medium text-[var(--text-primary)]">{nextRunDisplay}</span>
                </span>
              )}
              {!plan.isEnabled && (
                <span className="text-sm text-[var(--text-tertiary)]">
                  {t("contentPlans.pausedHint")}
                </span>
              )}
            </div>
          </div>
        </div>

        <PageSection>
          <ContentPlanForm
            initialData={plan}
            availableSources={sources}
            onSubmit={(data) => {
              updateMutation.mutate(data, {
                onSuccess: () => {
                  router.push(`/channels/${channelId}/content-plans`);
                },
              });
            }}
            isSubmitting={updateMutation.isPending}
            submitLabel={t("common.save")}
          />
        </PageSection>
      </div>
    </PageLayout>
  );
}
