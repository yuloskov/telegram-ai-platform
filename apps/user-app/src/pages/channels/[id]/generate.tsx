import { useEffect } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { useI18n } from "~/i18n";
import { useGenerationStore } from "~/stores/generation-store";
import {
  AutoContextPreview,
  GenerationPromptInput,
  SourceSelectionPanel,
  GeneratedPostsGrid,
} from "~/components/generate";

interface Channel {
  id: string;
  title: string;
}

interface Source {
  id: string;
  telegramUsername: string;
  isActive: boolean;
  scrapedContent: Array<{
    id: string;
    text: string | null;
    views: number;
    forwards: number;
    reactions: number;
    usedForGeneration: boolean;
  }>;
}

interface RecentPost {
  id: string;
  content: string;
  publishedAt: string;
}

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
    setGeneratedPosts,
    initializeSources,
    getSelectedPostIds,
    reset,
  } = useGenerationStore();

  // Reset store when leaving page
  useEffect(() => {
    return () => reset();
  }, [reset]);

  // Fetch channel
  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["channel", id],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${id}`);
      const json = await res.json();
      return json.data as Channel;
    },
    enabled: !!id && !authLoading,
  });

  // Fetch sources with content
  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ["sources-all-content", id],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${id}/sources/all-content`);
      const json = await res.json();
      return json.data as Source[];
    },
    enabled: !!id && !authLoading,
  });

  // Fetch recent posts for context
  const { data: recentPosts, isLoading: recentPostsLoading } = useQuery({
    queryKey: ["recent-posts", id],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${id}/recent-posts`);
      const json = await res.json();
      return json.data as RecentPost[];
    },
    enabled: !!id && !authLoading,
  });

  // Initialize sources when loaded
  useEffect(() => {
    if (sources) {
      initializeSources(sources);
    }
  }, [sources, initializeSources]);

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const selectedIds = getSelectedPostIds();
      const res = await fetch("/api/generate/multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: id,
          scrapedContentIds: selectedIds,
          customPrompt: customPrompt || undefined,
          count: 3,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (data) => {
      setGeneratedPosts(data.posts);
    },
  });

  const selectedPostIds = getSelectedPostIds();
  const canGenerate = selectedPostIds.length > 0;

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

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
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
          {/* Auto-context preview */}
          <AutoContextPreview
            posts={recentPosts || []}
            isLoading={recentPostsLoading}
          />

          {/* Source selection */}
          <PageSection title={t("generatePage.inspirationSources")}>
            <SourceSelectionPanel
              sources={sources || []}
              isLoading={sourcesLoading}
              channelId={id as string}
            />
          </PageSection>

          {/* Custom prompt */}
          <PageSection title={t("generatePage.customGuidanceSection")}>
            <GenerationPromptInput
              value={customPrompt}
              onChange={setCustomPrompt}
            />
          </PageSection>

          {/* Generate button */}
          <div className="flex justify-center pt-2">
            <Button
              size="lg"
              onClick={() => generateMutation.mutate()}
              disabled={!canGenerate || generateMutation.isPending}
            >
              <Sparkles className={`h-5 w-5 ${generateMutation.isPending ? "animate-pulse" : ""}`} />
              {generateMutation.isPending
                ? t("generate.generating")
                : t("generatePage.generatePosts", { count: 3 })}
            </Button>
          </div>

          {/* Error message */}
          {generateMutation.isError && (
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--status-error-subtle)] text-[var(--status-error)] text-sm text-center">
              {generateMutation.error?.message || t("common.error")}
            </div>
          )}

          {/* Generated posts */}
          {generatedPosts.length > 0 && (
            <PageSection title="">
              <GeneratedPostsGrid
                posts={generatedPosts}
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
