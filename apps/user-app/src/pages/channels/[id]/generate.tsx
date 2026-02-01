import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { useChannel } from "~/hooks/useChannel";
import { useSvgSettings } from "~/hooks/useSvgSettings";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Spinner } from "~/components/ui/spinner";
import { useI18n } from "~/i18n";
import { useGenerationStore } from "~/stores/generation-store";
import {
  ChannelContextItem,
  GenerationPromptInput,
  SourceSelectionPanel,
  GeneratedPostsGrid,
} from "~/components/generate";
import { GenerationOptions } from "~/components/generate/generation-options";
import type { ImageType } from "~/components/generate/image-type-toggle";

interface Source {
  id: string;
  sourceType: "telegram" | "document" | "webpage";
  telegramUsername: string | null;
  documentName: string | null;
  webpageTitle: string | null;
  webpageDomain: string | null;
  isActive: boolean;
  scrapedContent: Array<{ id: string; text: string | null; views: number; scrapedAt: string; mediaUrls: string[] }>;
}

interface RecentPost { id: string; content: string; publishedAt: string; mediaUrls: string[]; }

export default function GeneratePage() {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const {
    customPrompt,
    setCustomPrompt,
    generatedPosts,
    generatedSources,
    setGenerationResult,
    initializeSources,
    getSelectedPostIds,
    channelContextEnabled,
    channelContextSelectedPostIds,
    initializeChannelContext,
    toggleChannelContext,
    toggleChannelContextPost,
    getSelectedChannelContextPostIds,
    reset,
  } = useGenerationStore();

  const [postCount, setPostCount] = useState(3);
  const [autoRegenerate, setAutoRegenerate] = useState(false);
  const [regenerateAllImages, setRegenerateAllImages] = useState(false);
  const [imageType, setImageType] = useState<ImageType>("raster");

  // SVG settings from localStorage
  const { settings: svgSettings, updateSetting: updateSvgSetting } = useSvgSettings();

  useEffect(() => {
    return () => reset();
  }, [reset]);

  const { data: channel, isLoading: channelLoading } = useChannel(id, {
    enabled: !authLoading,
  });

  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ["sources-all-content", id],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${id}/sources/all-content`);
      const json = await res.json();
      return json.data as Source[];
    },
    enabled: !!id && !authLoading,
  });

  const { data: recentPosts, isLoading: recentPostsLoading } = useQuery({
    queryKey: ["recent-posts", id],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${id}/recent-posts`);
      const json = await res.json();
      return json.data as RecentPost[];
    },
    enabled: !!id && !authLoading,
  });

  useEffect(() => {
    if (sources) initializeSources(sources);
  }, [sources, initializeSources]);

  useEffect(() => {
    if (recentPosts) initializeChannelContext(recentPosts);
  }, [recentPosts, initializeChannelContext]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const selectedIds = getSelectedPostIds();
      const channelContextPostIds = getSelectedChannelContextPostIds();
      const res = await fetch("/api/generate/multi-with-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: id,
          scrapedContentIds: selectedIds,
          channelContextPostIds: channelContextPostIds.length > 0 ? channelContextPostIds : undefined,
          customPrompt: customPrompt || undefined,
          count: postCount,
          autoRegenerate,
          regenerateAllImages,
          imageType,
          // Pass SVG settings from localStorage
          svgSettings: imageType === "svg" ? svgSettings : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (data) => setGenerationResult(data),
  });

  const selectedPostIds = getSelectedPostIds();
  const hasCustomPrompt = customPrompt.trim().length > 0;
  const canGenerate = selectedPostIds.length > 0 || hasCustomPrompt;

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
    <PageLayout title={`${t("generatePage.title")} - ${channel.title}`}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
        <PageHeader
          title={t("generatePage.title")}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title, href: `/channels/${id}` },
            { label: t("generatePage.title") },
          ]}
        />

        <div className="space-y-6">
          <ChannelContextItem
            posts={recentPosts || []}
            enabled={channelContextEnabled}
            selectedPostIds={channelContextSelectedPostIds}
            onToggle={toggleChannelContext}
            onTogglePost={toggleChannelContextPost}
            isLoading={recentPostsLoading}
          />

          <PageSection title={t("generatePage.inspirationSources")}>
            <SourceSelectionPanel
              sources={sources || []}
              isLoading={sourcesLoading}
              channelId={id as string}
            />
          </PageSection>

          <PageSection title={t("generatePage.customGuidanceSection")}>
            <GenerationPromptInput
              value={customPrompt}
              onChange={setCustomPrompt}
            />
          </PageSection>

          <GenerationOptions
            postCount={postCount}
            onPostCountChange={setPostCount}
            autoRegenerate={autoRegenerate}
            onAutoRegenerateChange={setAutoRegenerate}
            regenerateAllImages={regenerateAllImages}
            onRegenerateAllImagesChange={setRegenerateAllImages}
            imageType={imageType}
            onImageTypeChange={setImageType}
            svgSettings={svgSettings}
            onSvgSettingUpdate={updateSvgSetting}
            onGenerate={() => generateMutation.mutate()}
            isGenerating={generateMutation.isPending}
            canGenerate={canGenerate}
          />

          {generateMutation.isError && (
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--status-error-subtle)] text-[var(--status-error)] text-sm text-center">
              {generateMutation.error?.message || t("common.error")}
            </div>
          )}

          {generatedPosts.length > 0 && (
            <PageSection title="">
              <GeneratedPostsGrid
                posts={generatedPosts}
                sources={generatedSources}
                channelId={id as string}
                channelName={channel.title}
                onGenerateMore={() => generateMutation.mutate()}
                isGenerating={generateMutation.isPending}
              />
            </PageSection>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
