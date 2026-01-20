import { create } from "zustand";

interface ContentSelectionStore {
  selectedIds: Set<string>;
  sourceId: string | null;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setSourceId: (sourceId: string) => void;
  isSelected: (id: string) => boolean;
}

export const useContentSelectionStore = create<ContentSelectionStore>((set, get) => ({
  selectedIds: new Set(),
  sourceId: null,

  toggleSelection: (id: string) => {
    set((state) => {
      const newSet = new Set(state.selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedIds: newSet };
    });
  },

  selectAll: (ids: string[]) => {
    set({ selectedIds: new Set(ids) });
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  setSourceId: (sourceId: string) => {
    const currentSourceId = get().sourceId;
    // Clear selection when switching sources
    if (currentSourceId !== sourceId) {
      set({ sourceId, selectedIds: new Set() });
    } else {
      set({ sourceId });
    }
  },

  isSelected: (id: string) => {
    return get().selectedIds.has(id);
  },
}));
