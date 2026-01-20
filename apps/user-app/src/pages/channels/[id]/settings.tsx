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
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ArrowLeft, Save, AlertCircle, Check } from "lucide-react";
import { useI18n } from "~/i18n";

export default function ChannelSettingsPage() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [settings, setSettings] = useState({
    niche: "",
    tone: "professional",
    language: "en",
    hashtags: "",
  });
  const [showSuccess, setShowSuccess] = useState(false);

  // Use shared channel hook
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
    mutationFn: async (data: typeof settings) => {
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

  // Handle loading state
  if (authLoading || channelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Handle not found
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
          <div className="space-y-6">
            {/* Niche */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                {t("channelSettings.nicheLabel")}
              </label>
              <Input
                value={settings.niche}
                onChange={(e) =>
                  setSettings({ ...settings, niche: e.target.value })
                }
                placeholder={t("channelSettings.nichePlaceholder")}
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {t("channelSettings.nicheHint")}
              </p>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                {t("channelSettings.toneLabel")}
              </label>
              <Select
                value={settings.tone}
                onValueChange={(value) =>
                  setSettings({ ...settings, tone: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">
                    {t("channelSettings.toneProfessional")}
                  </SelectItem>
                  <SelectItem value="casual">
                    {t("channelSettings.toneCasual")}
                  </SelectItem>
                  <SelectItem value="humorous">
                    {t("channelSettings.toneHumorous")}
                  </SelectItem>
                  <SelectItem value="informative">
                    {t("channelSettings.toneInformative")}
                  </SelectItem>
                  <SelectItem value="inspirational">
                    {t("channelSettings.toneInspirational")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content Language */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                {t("channelSettings.contentLanguageLabel")}
              </label>
              <Select
                value={settings.language}
                onValueChange={(value) =>
                  setSettings({ ...settings, language: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    {t("channelSettings.contentLanguageEnglish")}
                  </SelectItem>
                  <SelectItem value="ru">
                    {t("channelSettings.contentLanguageRussian")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {t("channelSettings.contentLanguageHint")}
              </p>
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                {t("channelSettings.hashtagsLabel")}
              </label>
              <Input
                value={settings.hashtags}
                onChange={(e) =>
                  setSettings({ ...settings, hashtags: e.target.value })
                }
                placeholder={t("channelSettings.hashtagsPlaceholder")}
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {t("channelSettings.hashtagsHint")}
              </p>
            </div>

            {/* Error */}
            {updateMutation.isError && (
              <div className="flex items-start gap-3 bg-[#f8d7da] text-[#721c24] p-4 rounded-[var(--radius-md)]">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm">
                  {updateMutation.error?.message || t("channelSettings.saveError")}
                </p>
              </div>
            )}

            {/* Success */}
            {showSuccess && (
              <div className="flex items-center gap-3 bg-[#d4edda] text-[#155724] p-4 rounded-[var(--radius-md)]">
                <Check className="h-5 w-5" />
                <p className="text-sm">{t("channelSettings.saveSuccess")}</p>
              </div>
            )}

            {/* Save Button */}
            <Button
              onClick={() => updateMutation.mutate(settings)}
              disabled={updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? (
                <>
                  <Spinner size="sm" />
                  {t("channelSettings.saving")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t("channelSettings.save")}
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
