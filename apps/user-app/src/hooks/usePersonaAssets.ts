import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiMutate } from "~/lib/api";
import type { PersonaAsset } from "~/types";

export function usePersonaAssets(channelId: string | undefined) {
  return useQuery({
    queryKey: ["personaAssets", channelId],
    queryFn: () => apiFetch<PersonaAsset[]>(`/api/channels/${channelId}/persona/assets`),
    enabled: !!channelId,
  });
}

export function useCreatePersonaAsset(channelId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`/api/channels/${channelId}/persona/assets`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as PersonaAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personaAssets", channelId] });
    },
  });
}

export function useUpdatePersonaAsset(channelId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, data }: { assetId: string; data: { label?: string; description?: string } }) => {
      return apiMutate<PersonaAsset>(`/api/channels/${channelId}/persona/assets/${assetId}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personaAssets", channelId] });
    },
  });
}

export function useDeletePersonaAsset(channelId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      return apiMutate(`/api/channels/${channelId}/persona/assets/${assetId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personaAssets", channelId] });
    },
  });
}
