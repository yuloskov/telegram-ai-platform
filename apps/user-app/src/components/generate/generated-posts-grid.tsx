import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "~/i18n";
import { Button } from "~/components/ui/button";
import { PostEditorModal } from "~/components/posts/post-editor-modal";
import { GeneratedPostCard } from "./generated-post-card";
import { RefreshCw, Save } from "lucide-react";
import { useGenerationStore, type ImageDecision, type PostImage } from "~/stores/generation-store";

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
  const { savedPostIndices, updatePost, markPostAsSaved } = useGenerationStore();

  const [editingPostIndex, setEditingPostIndex] = useState<number | null>(null);
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
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        if (!post) continue;
        await saveMutation.mutateAsync({ content: post.content, images: post.images });
        markPostAsSaved(i);
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
      markPostAsSaved(index);
    } finally {
      setSavingPostIndex(null);
    }
  };

  const handleEditPost = (index: number) => {
    const post = posts[index];
    if (!post) return;
    const postSources = sources.filter((s) => post.sourceIds.includes(s.id));
    setEditingPostIndex(index);
    setEditingSources(postSources);
    setEditPostImages(post.images ?? []);
    setEditContent(post.content);
    // Default to selecting generated images if available, otherwise all images
    const generatedImages = (post.images ?? []).filter((img) => img.isGenerated);
    setEditImages(generatedImages.length > 0 ? generatedImages : post.images ?? []);
  };

  const handleSaveFromEditor = async () => {
    if (editingPostIndex === null) return;
    await saveMutation.mutateAsync({ content: editContent, images: editImages.length > 0 ? editImages : undefined });
    markPostAsSaved(editingPostIndex);
    setEditingPostIndex(null);
    setEditContent("");
    setEditPostImages([]);
    setEditImages([]);
  };

  const handleImageRegenerated = (oldUrl: string, newImage: PostImage) => {
    // Update post images - add new image to the list
    const newPostImages = [...editPostImages, newImage];
    setEditPostImages(newPostImages);
    // Update selected images - replace old with new if it was selected
    const newSelectedImages = (() => {
      const wasSelected = editImages.some((img) => img.url === oldUrl);
      if (wasSelected) {
        return [...editImages.filter((img) => img.url !== oldUrl), newImage];
      }
      // Auto-select the new image
      return [...editImages, newImage];
    })();
    setEditImages(newSelectedImages);
    // Persist to store
    if (editingPostIndex !== null) {
      updatePost(editingPostIndex, { images: newPostImages });
    }
  };

  const handleNewImageGenerated = (newImage: PostImage) => {
    // Add to available images
    const newPostImages = [...editPostImages, newImage];
    setEditPostImages(newPostImages);
    // Auto-select the new image
    setEditImages((prev) => [...prev, newImage]);
    // Persist to store
    if (editingPostIndex !== null) {
      updatePost(editingPostIndex, { images: newPostImages });
    }
  };

  const handleContentChange = (newContent: string) => {
    setEditContent(newContent);
    // Persist content to store so it's not lost if modal is closed
    if (editingPostIndex !== null) {
      updatePost(editingPostIndex, { content: newContent });
    }
  };

  const handleCloseModal = () => {
    // Persist any changes to the store before closing
    if (editingPostIndex !== null) {
      updatePost(editingPostIndex, { content: editContent, images: editPostImages });
    }
    setEditingPostIndex(null);
    setEditContent("");
    setEditPostImages([]);
    setEditImages([]);
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
              onEdit={() => handleEditPost(index)}
              onSave={() => handleSavePost(index, post.content, post.images)}
              isSaving={savingPostIndex === index}
              isSaved={savedPostIndices.has(index)}
            />
          );
        })}
      </div>

      {/* Editor Modal */}
      <PostEditorModal
        open={editingPostIndex !== null}
        onOpenChange={(open) => !open && handleCloseModal()}
        content={editContent}
        onContentChange={handleContentChange}
        onSave={handleSaveFromEditor}
        onCancel={handleCloseModal}
        isSaving={saveMutation.isPending}
        channelName={channelName}
        channelId={channelId}
        isGenerated={true}
        sources={editingSources}
        postImages={editPostImages}
        selectedImages={editImages}
        onImagesChange={setEditImages}
        onImageRegenerated={handleImageRegenerated}
        onNewImageGenerated={handleNewImageGenerated}
      />
    </div>
  );
}
