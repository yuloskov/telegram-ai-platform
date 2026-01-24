// Hooks for content plan data fetching and mutations

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiMutate } from "~/lib/api";

export interface ContentPlanSource {
  id: string;
  contentSourceId: string;
  telegramUsername: string;
}

export interface ContentPlan {
  id: string;
  name: string;
  promptTemplate: string;
  isEnabled: boolean;
  cronSchedule: string;
  timezone: string;
  publishMode: "auto_publish" | "review_first" | "draft_only";
  selectionStrategy: "recent" | "random";
  selectionCount: number;
  imageEnabled: boolean;
  imageType: string;
  svgThemeColor: string;
  svgBackgroundStyle: string;
  svgFontStyle: string;
  svgStylePrompt: string | null;
  toneOverride: string | null;
  languageOverride: string | null;
  lookbackDays: number;
  lookbackPostCount: number;
  topicsToAvoid: string[];
  createdAt: string;
  updatedAt: string;
  nextRunAt: string | null;
  contentSources: ContentPlanSource[];
}

export interface CreateContentPlanInput {
  name: string;
  promptTemplate: string;
  cronSchedule?: string;
  timezone?: string;
  publishMode?: "auto_publish" | "review_first" | "draft_only";
  selectionStrategy?: "recent" | "random";
  selectionCount?: number;
  imageEnabled?: boolean;
  imageType?: string;
  svgThemeColor?: string;
  svgBackgroundStyle?: string;
  svgFontStyle?: string;
  svgStylePrompt?: string | null;
  toneOverride?: string | null;
  languageOverride?: string | null;
  lookbackDays?: number;
  lookbackPostCount?: number;
  topicsToAvoid?: string[];
  contentSourceIds?: string[];
}

export interface UpdateContentPlanInput extends Partial<CreateContentPlanInput> {
  isEnabled?: boolean;
}

/**
 * Hook for fetching all content plans for a channel.
 */
export function useContentPlans(
  channelId: string | undefined,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["content-plans", channelId],
    queryFn: () => apiFetch<ContentPlan[]>(`/api/channels/${channelId}/content-plans`),
    enabled: !!channelId && enabled,
  });
}

/**
 * Hook for fetching a single content plan.
 */
export function useContentPlan(
  channelId: string | undefined,
  planId: string | undefined,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["content-plan", channelId, planId],
    queryFn: () => apiFetch<ContentPlan>(`/api/channels/${channelId}/content-plans/${planId}`),
    enabled: !!channelId && !!planId && enabled,
  });
}

/**
 * Hook for creating a new content plan.
 */
export function useCreateContentPlan(channelId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContentPlanInput) => {
      return apiMutate<ContentPlan, CreateContentPlanInput>(
        `/api/channels/${channelId}/content-plans`,
        "POST",
        input
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plans", channelId] });
    },
  });
}

/**
 * Hook for updating a content plan.
 */
export function useUpdateContentPlan(
  channelId: string | undefined,
  planId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateContentPlanInput) => {
      return apiMutate<ContentPlan, UpdateContentPlanInput>(
        `/api/channels/${channelId}/content-plans/${planId}`,
        "PUT",
        input
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plans", channelId] });
      queryClient.invalidateQueries({ queryKey: ["content-plan", channelId, planId] });
    },
  });
}

/**
 * Hook for deleting a content plan.
 */
export function useDeleteContentPlan(channelId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      return apiMutate<ContentPlan>(
        `/api/channels/${channelId}/content-plans/${planId}`,
        "DELETE"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plans", channelId] });
    },
  });
}

/**
 * Hook for toggling a content plan's enabled status.
 */
export function useToggleContentPlan(channelId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      return apiMutate<ContentPlan>(
        `/api/channels/${channelId}/content-plans/${planId}/toggle`,
        "POST"
      );
    },
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries({ queryKey: ["content-plans", channelId] });
      queryClient.invalidateQueries({ queryKey: ["content-plan", channelId, planId] });
    },
  });
}
