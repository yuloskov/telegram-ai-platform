import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { useChannel } from "~/hooks/useChannel";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout } from "~/components/layout/page-layout";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { ChannelSettingsForm, type ChannelSettings } from "~/components/channels/channel-settings-form";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "~/i18n";

export default function ChannelSettingsPage() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [settings, setSettings] = useState<ChannelSettings>({
    niche: "",
    tone: "professional",
    language: "en",
    hashtags: "",
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: channel, isLoading: channelLoading } = useChannel(id, {
    enabled: !authLoading,
  });

  useEffect(() => {
    if (channel) {
      setSettings({
        niche: channel.niche || "",
        tone: channel.tone,
        language: channel.language,
        hashtags: channel.hashtags.join(", "),
      });
    }
  }, [channel]);

  const updateMutation = useMutation({
    mutationFn: async (data: ChannelSettings) => {
      const res = await fetch(`/api/channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: data.niche || null,
          tone: data.tone,
          language: data.language,
          hashtags: data.hashtags
            .split(",")
            .map((h) => h.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel", id] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
  });

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

  return (
    <PageLayout title={`${t("channelSettings.title")} - ${channel.title}`}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-2xl mx-auto">
        <PageHeader
          title={t("channelSettings.title")}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title, href: `/channels/${id}` },
            { label: t("channelSettings.title") },
          ]}
          actions={
            <Button variant="ghost" asChild>
              <Link href={`/channels/${id}`}>
                <ArrowLeft className="h-4 w-4" />
                {t("common.back")}
              </Link>
            </Button>
          }
        />

        {channel.username && (
          <p className="text-sm text-[var(--text-secondary)] -mt-4 mb-6">
            @{channel.username}
          </p>
        )}

        <Card className="p-6">
          <ChannelSettingsForm
            settings={settings}
            onSettingsChange={setSettings}
            onSave={() => updateMutation.mutate(settings)}
            isSaving={updateMutation.isPending}
            isError={updateMutation.isError}
            errorMessage={updateMutation.error?.message}
            showSuccess={showSuccess}
          />
        </Card>
      </div>
    </PageLayout>
  );
}
