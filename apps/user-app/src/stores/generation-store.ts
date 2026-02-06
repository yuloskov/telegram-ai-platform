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
  sourceType: "telegram" | "document" | "webpage" | "website";
  telegramUsername: string | null;
  documentName: string | null;
  webpageTitle: string | null;
  webpageDomain: string | null;
  websiteTitle: string | null;
  websiteDomain: string | null;
  isActive: boolean;
  scrapedContent: Array<{
    id: string;
    text: string | null;
    views: number;
    scrapedAt: string;
    mediaUrls: string[];
  }>;
}


interface ChannelPost {
  id: string;
  content: string;
  publishedAt: string;
}

interface GenerationStore {
  // Source selections
  sourceSelections: Map<string, SourceSelection>;
  toggleSource: (sourceId: string, posts?: Array<{ id: string }>) => void;
  setPostCount: (sourceId: string, count: number) => void;
  togglePost: (sourceId: string, postId: string) => void;
  selectRandomPosts: (sourceId: string, allPostIds: string[], count: number) => void;
  initializeSources: (sources: Source[]) => void;
  getSelectedPostIds: () => string[];

  // Channel context selection
  channelContextEnabled: boolean;
  channelContextSelectedPostIds: Set<string>;
  initializeChannelContext: (posts: ChannelPost[]) => void;
  toggleChannelContext: () => void;
  toggleChannelContextPost: (postId: string) => void;
  getSelectedChannelContextPostIds: () => string[];

  // Custom prompt
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;

  // Results
  generatedPosts: GeneratedPost[];
  generatedSources: SourceContent[];
  savedPostIndices: Set<number>;
  setGenerationResult: (result: GenerationResult) => void;
  updatePost: (index: number, updates: { content?: string; images?: PostImage[] }) => void;
  markPostAsSaved: (index: number) => void;

  // Reset
  reset: () => void;
}

const DEFAULT_POST_COUNT = 5;

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  sourceSelections: new Map(),
  channelContextEnabled: false,
  channelContextSelectedPostIds: new Set(),
  customPrompt: "",
  generatedPosts: [],
  generatedSources: [],
  savedPostIndices: new Set(),

  initializeSources: (sources: Source[]) => {
    const selections = new Map<string, SourceSelection>();

    sources.forEach((source) => {
      // Initialize with no posts selected by default
      selections.set(source.id, {
        enabled: false,
        postCount: DEFAULT_POST_COUNT,
        selectedPostIds: new Set(),
      });
    });

    set({ sourceSelections: selections });
  },

  initializeChannelContext: (_posts: ChannelPost[]) => {
    // Initialize with no posts selected by default
    set({
      channelContextEnabled: false,
      channelContextSelectedPostIds: new Set(),
    });
  },

  toggleChannelContext: () => {
    set((state) => {
      const willBeEnabled = !state.channelContextEnabled;
      return {
        channelContextEnabled: willBeEnabled,
        // Clear selections when disabling
        channelContextSelectedPostIds: willBeEnabled
          ? state.channelContextSelectedPostIds
          : new Set(),
      };
    });
  },

  toggleChannelContextPost: (postId: string) => {
    set((state) => {
      const newSelectedIds = new Set(state.channelContextSelectedPostIds);
      if (newSelectedIds.has(postId)) {
        newSelectedIds.delete(postId);
      } else {
        newSelectedIds.add(postId);
      }
      return { channelContextSelectedPostIds: newSelectedIds };
    });
  },

  getSelectedChannelContextPostIds: () => {
    const { channelContextEnabled, channelContextSelectedPostIds } = get();
    if (!channelContextEnabled) return [];
    return Array.from(channelContextSelectedPostIds);
  },

  toggleSource: (sourceId: string, posts?: Array<{ id: string }>) => {
    set((state) => {
      const newSelections = new Map(state.sourceSelections);
      const current = newSelections.get(sourceId);

      if (current) {
        const willBeEnabled = !current.enabled;
        // When enabling, auto-select first 5 posts if posts are provided
        const selectedPostIds = willBeEnabled && posts
          ? new Set(posts.slice(0, DEFAULT_POST_COUNT).map((p) => p.id))
          : willBeEnabled
            ? current.selectedPostIds
            : new Set<string>();

        newSelections.set(sourceId, {
          ...current,
          enabled: willBeEnabled,
          selectedPostIds,
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

  selectRandomPosts: (sourceId: string, allPostIds: string[], count: number) => {
    set((state) => {
      const newSelections = new Map(state.sourceSelections);
      const current = newSelections.get(sourceId);

      if (current) {
        // Fisher-Yates shuffle and take first N
        const shuffled = [...allPostIds];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
        }
        const randomIds = shuffled.slice(0, count);

        newSelections.set(sourceId, {
          ...current,
          enabled: true,
          selectedPostIds: new Set(randomIds),
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
    set({ generatedPosts: result.posts, generatedSources: result.sources, savedPostIndices: new Set() });
  },

  updatePost: (index: number, updates: { content?: string; images?: PostImage[] }) => {
    set((state) => {
      const newPosts = [...state.generatedPosts];
      const post = newPosts[index];
      if (post) {
        newPosts[index] = {
          ...post,
          ...(updates.content !== undefined && { content: updates.content }),
          ...(updates.images !== undefined && { images: updates.images }),
        };
      }
      return { generatedPosts: newPosts };
    });
  },

  markPostAsSaved: (index: number) => {
    set((state) => {
      const newSavedIndices = new Set(state.savedPostIndices);
      newSavedIndices.add(index);
      return { savedPostIndices: newSavedIndices };
    });
  },

  reset: () => {
    set({
      sourceSelections: new Map(),
      channelContextEnabled: false,
      channelContextSelectedPostIds: new Set(),
      customPrompt: "",
      generatedPosts: [],
      generatedSources: [],
      savedPostIndices: new Set(),
    });
  },
}));
