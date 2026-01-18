import { useState } from "react";
import { useRouter } from "next/router";
import { useMutation } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { env } from "~/env";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Spinner } from "~/components/ui/spinner";
import { StepIndicator } from "~/components/channels/step-indicator";
import { ConnectChannelStep } from "~/components/channels/connect-channel-step";
import { ConfigureChannelStep } from "~/components/channels/configure-channel-step";
import { useI18n } from "~/i18n";

interface VerifyResponse {
  valid: boolean;
  canPost: boolean;
  channelInfo?: {
    id: number;
    title: string;
    username?: string;
  };
  error?: string;
}

export default function NewChannelPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [step, setStep] = useState(1);
  const [channelId, setChannelId] = useState("");
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [settings, setSettings] = useState({
    niche: "",
    tone: "professional",
    language: "en",
    hashtags: "",
  });

  const botUsername = env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  const verifyMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const res = await fetch("/api/channels/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      const data = await res.json();
      return data.data as VerifyResponse;
    },
    onSuccess: (data) => {
      setVerifyResult(data);
      if (data.valid && data.canPost) {
        setStep(2);
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: verifyResult?.channelInfo?.id,
          title: verifyResult?.channelInfo?.title,
          niche: settings.niche || null,
          tone: settings.tone,
          language: settings.language,
          hashtags: settings.hashtags
            .split(",")
            .map((h) => h.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error);
      }
      return data.data;
    },
    onSuccess: (data) => {
      router.push(`/channels/${data.id}`);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <PageLayout title={t("addChannel.pageTitle")}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-xl mx-auto">
        <PageHeader
          title={t("addChannel.title")}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: t("addChannel.title") },
          ]}
        />

        {/* Progress Steps */}
        <PageSection>
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-4">
              <StepIndicator number={1} active={step >= 1} completed={step > 1} />
              <div
                className={`w-16 h-0.5 ${
                  step >= 2 ? "bg-[var(--accent-primary)]" : "bg-[var(--border-primary)]"
                }`}
              />
              <StepIndicator number={2} active={step >= 2} />
            </div>
          </div>
        </PageSection>

        {step === 1 && (
          <PageSection>
            <ConnectChannelStep
              channelId={channelId}
              onChannelIdChange={setChannelId}
              verifyResult={verifyResult}
              onVerify={() => verifyMutation.mutate(channelId)}
              isVerifying={verifyMutation.isPending}
              botUsername={botUsername}
            />
          </PageSection>
        )}

        {step === 2 && verifyResult?.channelInfo && (
          <PageSection>
            <ConfigureChannelStep
              channelInfo={verifyResult.channelInfo}
              settings={settings}
              onSettingsChange={setSettings}
              onBack={() => setStep(1)}
              onCreate={() => createMutation.mutate()}
              isCreating={createMutation.isPending}
              error={createMutation.error}
            />
          </PageSection>
        )}
      </div>
    </PageLayout>
  );
}
