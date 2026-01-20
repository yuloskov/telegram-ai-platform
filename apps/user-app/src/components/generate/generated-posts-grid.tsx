import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "~/i18n";
import { Button } from "~/components/ui/button";
import { PostEditorModal } from "~/components/posts/post-editor-modal";
import { GeneratedPostCard } from "./generated-post-card";
import { RefreshCw, Save } from "lucide-react";

interface GeneratedPost {
  content: string;
  angle: string;
}

interface GeneratedPostsGridProps {
  posts: GeneratedPost[];
  channelId: string;
  channelName: string;
  onGenerateMore: () => void;
  isGenerating: boolean;
}

export function GeneratedPostsGrid({
  posts,
  channelId,
  channelName,
  onGenerateMore,
  isGenerating,
}: GeneratedPostsGridProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [editingPost, setEditingPost] = useState<GeneratedPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingPostIndex, setSavingPostIndex] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, content }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", channelId] });
    },
  });

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      for (const post of posts) {
        await saveMutation.mutateAsync(post.content);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", channelId] });
    },
  });

  const handleSavePost = async (index: number, content: string) => {
    setSavingPostIndex(index);
    try {
      await saveMutation.mutateAsync(content);
    } finally {
      setSavingPostIndex(null);
    }
  };

  const handleEditPost = (post: GeneratedPost) => {
    setEditingPost(post);
    setEditContent(post.content);
  };

  const handleSaveFromEditor = async () => {
    await saveMutation.mutateAsync(editContent);
    setEditingPost(null);
    setEditContent("");
  };

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          {t("generatePage.generatedPosts")}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerateMore}
            disabled={isGenerating}
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
            {t("generatePage.generateMore")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => saveAllMutation.mutate()}
            disabled={saveAllMutation.isPending}
          >
            <Save className="h-4 w-4" />
            {saveAllMutation.isPending
              ? t("postEditor.saving")
              : t("generatePage.saveAllAsDrafts")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, index) => (
          <GeneratedPostCard
            key={index}
            content={post.content}
            angle={post.angle}
            index={index}
            onEdit={() => handleEditPost(post)}
            onSave={() => handleSavePost(index, post.content)}
            isSaving={savingPostIndex === index}
          />
        ))}
      </div>

      {/* Editor Modal */}
      <PostEditorModal
        open={!!editingPost}
        onOpenChange={(open) => !open && setEditingPost(null)}
        content={editContent}
        onContentChange={setEditContent}
        onSave={handleSaveFromEditor}
        onCancel={() => setEditingPost(null)}
        isSaving={saveMutation.isPending}
        channelName={channelName}
        isGenerated={true}
      />
    </div>
  );
}
