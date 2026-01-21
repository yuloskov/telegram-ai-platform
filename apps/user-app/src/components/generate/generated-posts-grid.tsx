import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "~/i18n";
import { Button } from "~/components/ui/button";
import { PostEditorModal } from "~/components/posts/post-editor-modal";
import { GeneratedPostCard } from "./generated-post-card";
import { RefreshCw, Save } from "lucide-react";
import type { ImageDecision, PostImage } from "~/stores/generation-store";

interface GeneratedPost {
  content: string;
  angle: string;
  sourceIds: string[];
  imageDecision?: ImageDecision;
  images?: PostImage[];
}

interface SourceMedia {
  url: string;
  type: string;
}

interface SourceContent {
  id: string;
  text: string | null;
  telegramLink: string;
  media: SourceMedia[];
}

interface GeneratedPostsGridProps {
  posts: GeneratedPost[];
  sources: SourceContent[];
  channelId: string;
  channelName: string;
  onGenerateMore: () => void;
  isGenerating: boolean;
}

export function GeneratedPostsGrid({
  posts,
  sources,
  channelId,
  channelName,
  onGenerateMore,
  isGenerating,
}: GeneratedPostsGridProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [editingPost, setEditingPost] = useState<GeneratedPost | null>(null);
  const [editingSources, setEditingSources] = useState<SourceContent[]>([]);
  const [editPostImages, setEditPostImages] = useState<PostImage[]>([]);
  const [editContent, setEditContent] = useState("");
  const [editImages, setEditImages] = useState<PostImage[]>([]);
  const [savingPostIndex, setSavingPostIndex] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({ content, images }: { content: string; images?: PostImage[] }) => {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, content, images }),
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
        await saveMutation.mutateAsync({ content: post.content, images: post.images });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", channelId] });
    },
  });

  const handleSavePost = async (index: number, content: string, images?: PostImage[]) => {
    setSavingPostIndex(index);
    try {
      await saveMutation.mutateAsync({ content, images });
    } finally {
      setSavingPostIndex(null);
    }
  };

  const handleEditPost = (post: GeneratedPost) => {
    const postSources = sources.filter((s) => post.sourceIds.includes(s.id));
    setEditingPost(post);
    setEditingSources(postSources);
    setEditPostImages(post.images ?? []);
    setEditContent(post.content);
    // Default to selecting generated images if available, otherwise all images
    const generatedImages = (post.images ?? []).filter((img) => img.isGenerated);
    setEditImages(generatedImages.length > 0 ? generatedImages : post.images ?? []);
  };

  const handleSaveFromEditor = async () => {
    await saveMutation.mutateAsync({ content: editContent, images: editImages.length > 0 ? editImages : undefined });
    setEditingPost(null);
    setEditContent("");
    setEditPostImages([]);
    setEditImages([]);
  };

  const handleImageRegenerated = (oldUrl: string, newImage: PostImage) => {
    // Update post images - add new image to the list
    setEditPostImages((prev) => [...prev, newImage]);
    // Update selected images - replace old with new if it was selected
    setEditImages((prev) => {
      const wasSelected = prev.some((img) => img.url === oldUrl);
      if (wasSelected) {
        return [...prev.filter((img) => img.url !== oldUrl), newImage];
      }
      // Auto-select the new image
      return [...prev, newImage];
    });
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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post, index) => {
          const postSources = sources.filter((s) => post.sourceIds.includes(s.id));
          return (
            <GeneratedPostCard
              key={index}
              content={post.content}
              angle={post.angle}
              index={index}
              sources={postSources}
              imageDecision={post.imageDecision}
              images={post.images}
              onEdit={() => handleEditPost(post)}
              onSave={() => handleSavePost(index, post.content, post.images)}
              isSaving={savingPostIndex === index}
            />
          );
        })}
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
        channelId={channelId}
        isGenerated={true}
        sources={editingSources}
        postImages={editPostImages}
        selectedImages={editImages}
        onImagesChange={setEditImages}
        onImageRegenerated={handleImageRegenerated}
      />
    </div>
  );
}
