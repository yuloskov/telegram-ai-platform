import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "~/lib/api";

interface EditWithAIParams {
  channelId: string;
  currentContent: string;
  editInstruction: string;
}

interface EditWithAIResponse {
  content: string;
}

export function useEditWithAI(onSuccess?: (newContent: string) => void) {
  return useMutation({
    mutationFn: async (params: EditWithAIParams) => {
      const response = await apiRequest<EditWithAIResponse>("/api/posts/edit-with-ai", {
        method: "POST",
        body: {
          channelId: params.channelId,
          currentContent: params.currentContent,
          editInstruction: params.editInstruction,
        },
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to edit post with AI");
      }

      return response.data.content;
    },
    onSuccess: (newContent) => {
      onSuccess?.(newContent);
    },
  });
}
