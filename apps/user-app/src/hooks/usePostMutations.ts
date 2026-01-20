// Shared hooks for post mutations - eliminates duplication in post pages

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiMutate } from "~/lib/api";

interface UsePostMutationsOptions {
  postId: string | string[] | undefined;
  channelId: string | string[] | undefined;
  onDeleteSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onPublishSuccess?: () => void;
}

/**
 * Hook for post mutations: publish, update, delete.
 */
export function usePostMutations({
  postId,
  channelId,
  onDeleteSuccess,
  onUpdateSuccess,
  onPublishSuccess,
}: UsePostMutationsOptions) {
  const queryClient = useQueryClient();
  const id = Array.isArray(postId) ? postId[0] : postId;
  const chId = Array.isArray(channelId) ? channelId[0] : channelId;

  const publishMutation = useMutation({
    mutationFn: async () => {
      return apiMutate(`/api/posts/${id}/publish`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      queryClient.invalidateQueries({ queryKey: ["posts", chId] });
      onPublishSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiMutate(`/api/posts/${id}`, "PATCH", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      queryClient.invalidateQueries({ queryKey: ["posts", chId] });
      onUpdateSuccess?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiMutate(`/api/posts/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", chId] });
      onDeleteSuccess?.();
    },
  });

  return {
    publishMutation,
    updateMutation,
    deleteMutation,
  };
}

interface UseCreatePostOptions {
  channelId: string | string[] | undefined;
  onSuccess?: () => void;
}

/**
 * Hook for creating a new post.
 */
export function useCreatePost({ channelId, onSuccess }: UseCreatePostOptions) {
  const queryClient = useQueryClient();
  const chId = Array.isArray(channelId) ? channelId[0] : channelId;

  return useMutation({
    mutationFn: async (content: string) => {
      return apiMutate("/api/posts", "POST", {
        channelId: chId,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", chId] });
      onSuccess?.();
    },
  });
}
