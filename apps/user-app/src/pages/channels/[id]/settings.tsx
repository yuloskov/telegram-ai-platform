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
import { SVGSettingsInline } from "~/components/generate/svg-settings-inline";
import { PersonaModeToggle } from "~/components/persona/persona-mode-toggle";
import { PersonaDescriptionForm } from "~/components/persona/persona-description-form";
import { PersonaAssetsManager } from "~/components/persona/persona-assets-manager";
import { StoryArcList } from "~/components/persona/story-arc-list";
import type { SvgGenerationSettings } from "~/hooks/useSvgSettings";
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
  const [svgSettings, setSvgSettings] = useState<SvgGenerationSettings>({
    themeColor: "#3B82F6",
    textColor: "#1F2937",
    backgroundStyle: "gradient",
    fontStyle: "modern",
    stylePrompt: "",
  });
  const [channelMode, setChannelMode] = useState("standard");
  const [personaName, setPersonaName] = useState("");
  const [personaDescription, setPersonaDescription] = useState("");
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
      setSvgSettings({
        themeColor: channel.svgThemeColor,
        textColor: channel.svgTextColor,
        backgroundStyle: channel.svgBackgroundStyle as SvgGenerationSettings["backgroundStyle"],
        fontStyle: channel.svgFontStyle as SvgGenerationSettings["fontStyle"],
        stylePrompt: channel.svgStylePrompt || "",
      });
      setChannelMode(channel.channelMode || "standard");
      setPersonaName(channel.personaName || "");
      setPersonaDescription(channel.personaDescription || "");
    }
  }, [channel]);

  const updateMutation = useMutation({
    mutationFn: async (data: {
      settings: ChannelSettings;
      svgSettings: SvgGenerationSettings;
      channelMode: string;
      personaName: string;
      personaDescription: string;
    }) => {
      const res = await fetch(`/api/channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: data.settings.niche || null,
          tone: data.settings.tone,
          language: data.settings.language,
          hashtags: data.settings.hashtags
            .split(",")
            .map((h) => h.trim())
            .filter(Boolean),
          svgStylePrompt: data.svgSettings.stylePrompt || null,
          svgThemeColor: data.svgSettings.themeColor,
          svgTextColor: data.svgSettings.textColor,
          svgBackgroundStyle: data.svgSettings.backgroundStyle,
          svgFontStyle: data.svgSettings.fontStyle,
          channelMode: data.channelMode,
          personaName: data.personaName || null,
          personaDescription: data.personaDescription || null,
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

  const handleSave = () => {
    updateMutation.mutate({ settings, svgSettings, channelMode, personaName, personaDescription });
  };

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
            onSave={handleSave}
            isSaving={updateMutation.isPending}
            isError={updateMutation.isError}
            errorMessage={updateMutation.error?.message}
            showSuccess={showSuccess}
          />
        </Card>

        {/* Channel Mode Toggle */}
        <Card className="p-6 mt-6">
          <PersonaModeToggle value={channelMode} onChange={setChannelMode} />
        </Card>

        {/* Personal Blog Persona Settings */}
        {channelMode === "personal_blog" && (
          <>
            <Card className="p-6 mt-6">
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
                {t("persona.title")}
              </h3>
              <PersonaDescriptionForm
                personaName={personaName}
                personaDescription={personaDescription}
                onNameChange={setPersonaName}
                onDescriptionChange={setPersonaDescription}
              />
              <div className="mt-4">
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? t("persona.saving") : t("persona.savePersona")}
                </Button>
                {showSuccess && (
                  <span className="ml-3 text-sm text-green-600">{t("persona.saved")}</span>
                )}
              </div>
            </Card>

            <Card className="p-6 mt-6">
              <PersonaAssetsManager channelId={id as string} />
            </Card>

            <Card className="p-6 mt-6">
              <StoryArcList channelId={id as string} />
            </Card>
          </>
        )}

        <Card className="p-6 mt-6">
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
            {t("svg.title")}
          </h3>
          <SVGSettingsInline
            settings={svgSettings}
            onUpdate={(key, value) => setSvgSettings(prev => ({ ...prev, [key]: value }))}
          />
        </Card>
      </div>
    </PageLayout>
  );
}
