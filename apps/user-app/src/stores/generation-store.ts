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
  sourceType: "telegram" | "document" | "webpage";
  telegramUsername: string | null;
  documentName: string | null;
  webpageTitle: string | null;
  webpageDomain: string | null;
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
  toggleSource: (sourceId: string) => void;
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
  setGenerationResult: (result: GenerationResult) => void;

  // Reset
  reset: () => void;
}

const DEFAULT_POST_COUNT = 5;

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  sourceSelections: new Map(),
  channelContextEnabled: true,
  channelContextSelectedPostIds: new Set(),
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

  initializeChannelContext: (posts: ChannelPost[]) => {
    // Select all posts by default (up to 10)
    const topPostIds = posts.slice(0, 10).map((p) => p.id);
    set({
      channelContextEnabled: topPostIds.length > 0,
      channelContextSelectedPostIds: new Set(topPostIds),
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
    set({ generatedPosts: result.posts, generatedSources: result.sources });
  },

  reset: () => {
    set({
      sourceSelections: new Map(),
      channelContextEnabled: true,
      channelContextSelectedPostIds: new Set(),
      customPrompt: "",
      generatedPosts: [],
      generatedSources: [],
    });
  },
}));
