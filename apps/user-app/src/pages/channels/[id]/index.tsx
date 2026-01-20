import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useRequireAuth } from "~/hooks/useAuth";
import { AppHeader, PageHeader } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { GenerateModal } from "~/components/posts/generate-modal";
import { PostEditorModal } from "~/components/posts/post-editor-modal";
import { PostList } from "~/components/posts/post-list";
import { Sparkles, Plus, Settings, Lightbulb, ArrowRight } from "lucide-react";
import { Card } from "~/components/ui/card";
import { useI18n } from "~/i18n";

interface Channel {
  id: string;
  telegramId: string;
  username: string | null;
  title: string;
  niche: string | null;
  tone: string;
  language: string;
  hashtags: string[];
}

interface Post {
  id: string;
  content: string;
  status: string;
  generationType: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export default function ChannelDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const { isLoading: authLoading } = useRequireAuth();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [showGenerator, setShowGenerator] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [postContent, setPostContent] = useState("");

  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["channel", id],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${id}`);
      const json = await res.json();
      return json.data as Channel;
    },
    enabled: !!id && !authLoading,
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["posts", id],
    queryFn: async () => {
      const res = await fetch(`/api/posts?channelId=${id}`);
      const json = await res.json();
      return json as { data: Post[]; pagination: unknown };
    },
    enabled: !!id && !authLoading,
  });

  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await fetch("/api/generate/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: id, prompt }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      setPostContent(data.content);
      setShowGenerator(false);
      setShowPostEditor(true);
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: id, content }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", id] });
      setShowPostEditor(false);
      setPostContent("");
      setGeneratedContent("");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/posts/${postId}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", id] });
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

  const posts = postsData?.data || [];

  const handleCancelEditor = () => {
    setShowPostEditor(false);
    setPostContent("");
    setGeneratedContent("");
  };

  return (
    <PageLayout title={channel.title}>
      <AppHeader user={user} onLogout={logout} />

      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        <PageHeader
          title={channel.title}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowGenerator(true)}>
                <Sparkles className="h-4 w-4" />
                {t("channels.generate")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPostContent("");
                  setGeneratedContent("");
                  setShowPostEditor(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t("channels.newPost")}
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/channels/${id}/settings`}>
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          }
        />

        {channel.username && (
          <p className="text-sm text-[var(--text-secondary)] -mt-4 mb-6">
            @{channel.username}
          </p>
        )}

        {/* Similar Channels Feature Card */}
        <Card interactive className="mb-6">
          <Link href={`/channels/${id}/sources`} className="block p-4">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--accent-primary-subtle)] flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-[var(--accent-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  {t("sources.featureCardTitle")}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                  {t("sources.featureCardDescription")}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--text-tertiary)] shrink-0" />
            </div>
          </Link>
        </Card>

        <GenerateModal
          open={showGenerator}
          onOpenChange={setShowGenerator}
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={() => generateMutation.mutate(prompt)}
          isGenerating={generateMutation.isPending}
        />

        <PostEditorModal
          open={showPostEditor}
          onOpenChange={setShowPostEditor}
          content={postContent}
          onContentChange={setPostContent}
          onSave={() => createPostMutation.mutate(postContent)}
          onCancel={handleCancelEditor}
          isSaving={createPostMutation.isPending}
          channelName={channel.title}
          isGenerated={!!generatedContent}
        />

        {/* Posts List */}
        <PageSection title={t("posts.title")}>
          <PostList
            posts={posts}
            isLoading={postsLoading}
            channelId={id as string}
            onPublish={(postId) => publishMutation.mutate(postId)}
            isPublishing={publishMutation.isPending}
            onOpenGenerator={() => setShowGenerator(true)}
          />
        </PageSection>
      </div>
    </PageLayout>
  );
}
