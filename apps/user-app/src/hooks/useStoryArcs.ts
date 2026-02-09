import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiMutate } from "~/lib/api";
import type { StoryArc } from "~/types";

export function useStoryArcs(channelId: string | undefined) {
  return useQuery({
    queryKey: ["storyArcs", channelId],
    queryFn: () => apiFetch<StoryArc[]>(`/api/channels/${channelId}/persona/story-arcs`),
    enabled: !!channelId,
  });
}

interface CreateStoryArcData {
  title: string;
  description: string;
  activeDate: string;
  endDate?: string | null;
}

export function useCreateStoryArc(channelId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStoryArcData) => {
      return apiMutate<StoryArc>(`/api/channels/${channelId}/persona/story-arcs`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyArcs", channelId] });
    },
  });
}

interface UpdateStoryArcData {
  title?: string;
  description?: string;
  activeDate?: string;
  endDate?: string | null;
  isUsed?: boolean;
}

export function useUpdateStoryArc(channelId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ arcId, data }: { arcId: string; data: UpdateStoryArcData }) => {
      return apiMutate<StoryArc>(`/api/channels/${channelId}/persona/story-arcs/${arcId}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyArcs", channelId] });
    },
  });
}

export function useDeleteStoryArc(channelId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (arcId: string) => {
      return apiMutate(`/api/channels/${channelId}/persona/story-arcs/${arcId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyArcs", channelId] });
    },
  });
}
