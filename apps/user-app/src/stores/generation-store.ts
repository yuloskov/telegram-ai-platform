import { create } from "zustand";

interface SourceSelection {
  enabled: boolean;
  postCount: number;
  selectedPostIds: Set<string>;
}

interface GeneratedPost {
  content: string;
  angle: string;
}

interface Source {
  id: string;
  telegramUsername: string;
  isActive: boolean;
  scrapedContent: Array<{
    id: string;
    text: string | null;
    views: number;
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
  setGeneratedPosts: (posts: GeneratedPost[]) => void;

  // Reset
  reset: () => void;
}

const DEFAULT_POST_COUNT = 5;

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  sourceSelections: new Map(),
  customPrompt: "",
  generatedPosts: [],

  initializeSources: (sources: Source[]) => {
    const selections = new Map<string, SourceSelection>();

    sources.forEach((source) => {
      // Auto-select top posts by views (up to DEFAULT_POST_COUNT)
      const topPostIds = source.scrapedContent
        .slice(0, DEFAULT_POST_COUNT)
        .map((p) => p.id);

      selections.set(source.id, {
        enabled: source.scrapedContent.length > 0,
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
        newSelections.set(sourceId, {
          ...current,
          enabled: !current.enabled,
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

  setGeneratedPosts: (posts: GeneratedPost[]) => {
    set({ generatedPosts: posts });
  },

  reset: () => {
    set({
      sourceSelections: new Map(),
      customPrompt: "",
      generatedPosts: [],
    });
  },
}));
