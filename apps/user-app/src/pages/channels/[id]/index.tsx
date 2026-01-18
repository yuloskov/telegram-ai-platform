import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRequireAuth } from "~/hooks/useAuth";
import { Header } from "~/components/layout/header";
import { PageLayout, PageSection } from "~/components/layout/page-layout";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Spinner } from "~/components/ui/spinner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from "~/components/ui/modal";
import { EmptyState } from "~/components/telegram/empty-state";
import { StatusBadge } from "~/components/telegram/status-badge";
import { MessagePreview } from "~/components/telegram/message-bubble";
import { Sparkles, Plus, Settings, FileText, Send, RotateCcw } from "lucide-react";

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
        <p className="text-[var(--text-secondary)]">Channel not found</p>
      </div>
    );
  }

  const posts = postsData?.data || [];

  return (
    <PageLayout title={channel.title}>
      <Header
        title={channel.title}
        subtitle={channel.username ? `@${channel.username}` : undefined}
        backHref="/channels"
        actions={
          <Link href={`/channels/${id}/settings`}>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        }
      />

      <div className="max-w-4xl mx-auto">
        {/* Quick Actions */}
        <PageSection className="mt-6">
          <div className="flex gap-3">
            <Button onClick={() => setShowGenerator(true)}>
              <Sparkles className="h-4 w-4" />
              Generate with AI
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
              New Post
            </Button>
          </div>
        </PageSection>

        {/* AI Generator Modal */}
        <Modal open={showGenerator} onOpenChange={setShowGenerator}>
          <ModalContent className="max-w-lg">
            <ModalHeader>
              <ModalTitle>Generate Content</ModalTitle>
            </ModalHeader>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a topic or prompt for AI to generate content..."
              className="min-h-[120px]"
            />
            <ModalFooter>
              <Button variant="ghost" onClick={() => setShowGenerator(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => generateMutation.mutate(prompt)}
                disabled={!prompt || generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Spinner size="sm" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Post Editor Modal */}
        <Modal open={showPostEditor} onOpenChange={setShowPostEditor}>
          <ModalContent className="max-w-2xl">
            <ModalHeader>
              <ModalTitle>
                {generatedContent ? "Review Generated Content" : "Create Post"}
              </ModalTitle>
            </ModalHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Editor */}
              <div>
                <Textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Write your post content..."
                  className="min-h-[200px]"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  {postContent.length} / 4096 characters
                </p>
              </div>

              {/* Preview */}
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">Preview</p>
                {postContent ? (
                  <MessagePreview
                    content={postContent}
                    channelName={channel.title}
                  />
                ) : (
                  <div className="bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)] p-4 text-center text-sm text-[var(--text-tertiary)]">
                    Start typing to see preview
                  </div>
                )}
              </div>
            </div>

            <ModalFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPostEditor(false);
                  setPostContent("");
                  setGeneratedContent("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createPostMutation.mutate(postContent)}
                disabled={!postContent || createPostMutation.isPending}
              >
                {createPostMutation.isPending ? (
                  <>
                    <Spinner size="sm" />
                    Saving...
                  </>
                ) : (
                  "Save as Draft"
                )}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Posts List */}
        <PageSection title="Posts" className="mt-6">
          <Card>
            {postsLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Spinner />
              </div>
            ) : posts.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8 text-[var(--text-tertiary)]" />}
                title="No posts yet"
                description="Create your first post using AI or manually"
                action={
                  <Button onClick={() => setShowGenerator(true)}>
                    <Sparkles className="h-4 w-4" />
                    Generate with AI
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-[var(--border-secondary)]">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] line-clamp-2">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <StatusBadge status={post.status as "draft" | "scheduled" | "publishing" | "published" | "failed" | "pending_review"} />
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {post.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => publishMutation.mutate(post.id)}
                            disabled={publishMutation.isPending}
                          >
                            <Send className="h-3.5 w-3.5" />
                            Publish
                          </Button>
                        )}
                        {post.status === "failed" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => publishMutation.mutate(post.id)}
                            disabled={publishMutation.isPending}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </PageSection>
      </div>
    </PageLayout>
  );
}
