import { create } from "zustand";
import { isPostVideoOnly } from "~/lib/media";
import type {
  SourceContent,
  PostImage,
  ImageDecision,
  ImageAnalysisResult,
  ImageStrategy,
  GeneratedPost,
} from "~/types";

// Re-export types for backwards compatibility
export type { ImageStrategy, ImageDecision, ImageAnalysisResult, PostImage };

interface SourceSelection {
  enabled: boolean;
  postCount: number;
  selectedPostIds: Set<string>;
}

interface GenerationResult {
  posts: GeneratedPost[];
  sources: SourceContent[];
}

interface Source {
  id: string;
  telegramUsername: string;
  isActive: boolean;
  scrapedContent: Array<{
    id: string;
    text: string | null;
    views: number;
    scrapedAt: string;
    mediaUrls: string[];
  }>;
}


interface GenerationStore {
  // Source selections
  sourceSelections: Map<string, SourceSelection>;
  toggleSource: (sourceId: string) => void;
  setPostCount: (sourceId: string, count: number) => void;
  togglePost: (sourceId: string, postId: string) => void;
  initializeSources: (sources: Source[]) => void;
  getSelectedPostIds: () => string[];

  // Custom prompt
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;

  // Results
  generatedPosts: GeneratedPost[];
  generatedSources: SourceContent[];
  setGenerationResult: (result: GenerationResult) => void;

  // Reset
  reset: () => void;
}

const DEFAULT_POST_COUNT = 5;

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  sourceSelections: new Map(),
  customPrompt: "",
  generatedPosts: [],
  generatedSources: [],

  initializeSources: (sources: Source[]) => {
    const selections = new Map<string, SourceSelection>();

    sources.forEach((source) => {
      // Filter out video-only posts, then select first 5 (most recent, already sorted by API)
      const selectablePosts = source.scrapedContent.filter((p) => !isPostVideoOnly(p));
      const topPostIds = selectablePosts.slice(0, DEFAULT_POST_COUNT).map((p) => p.id);

      selections.set(source.id, {
        enabled: selectablePosts.length > 0,
        postCount: DEFAULT_POST_COUNT,
        selectedPostIds: new Set(topPostIds),
      });
    });

    set({ sourceSelections: selections });
  },

  toggleSource: (sourceId: string) => {
    set((state) => {
      const newSelections = new Map(state.sourceSelections);
      const current = newSelections.get(sourceId);

      if (current) {
        const willBeEnabled = !current.enabled;
        newSelections.set(sourceId, {
          ...current,
          enabled: willBeEnabled,
          // Clear selections when disabling
          selectedPostIds: willBeEnabled ? current.selectedPostIds : new Set(),
        });
      }

      return { sourceSelections: newSelections };
    });
  },

  setPostCount: (sourceId: string, count: number) => {
    set((state) => {
      const newSelections = new Map(state.sourceSelections);
      const current = newSelections.get(sourceId);

      if (current) {
        newSelections.set(sourceId, {
          ...current,
          postCount: Math.min(10, Math.max(1, count)),
        });
      }

      return { sourceSelections: newSelections };
    });
  },

  togglePost: (sourceId: string, postId: string) => {
    set((state) => {
      const newSelections = new Map(state.sourceSelections);
      const current = newSelections.get(sourceId);

      if (current) {
        const newSelectedIds = new Set(current.selectedPostIds);
        if (newSelectedIds.has(postId)) {
          newSelectedIds.delete(postId);
        } else {
          newSelectedIds.add(postId);
        }
        newSelections.set(sourceId, {
          ...current,
          selectedPostIds: newSelectedIds,
        });
      }

      return { sourceSelections: newSelections };
    });
  },

  getSelectedPostIds: () => {
    const { sourceSelections } = get();
    const allIds: string[] = [];

    sourceSelections.forEach((selection) => {
      if (selection.enabled) {
        selection.selectedPostIds.forEach((id) => allIds.push(id));
      }
    });

    return allIds;
  },

  setCustomPrompt: (prompt: string) => {
    set({ customPrompt: prompt });
  },

  setGenerationResult: (result: GenerationResult) => {
    set({ generatedPosts: result.posts, generatedSources: result.sources });
  },

  reset: () => {
    set({
      sourceSelections: new Map(),
      customPrompt: "",
      generatedPosts: [],
      generatedSources: [],
    });
  },
}));
