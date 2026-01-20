import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { Sparkles, FileText } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Spinner } from "~/components/ui/spinner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "~/components/ui/modal";
import { useContentSelectionStore } from "~/stores/content-selection-store";
import { useI18n } from "~/i18n";

interface GenerateFromScrapedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
}

export function GenerateFromScrapedModal({
  open,
  onOpenChange,
  channelId,
}: GenerateFromScrapedModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedIds, clearSelection } = useContentSelectionStore();
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/generate/from-scraped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          scrapedContentIds: Array.from(selectedIds),
          additionalInstructions: additionalInstructions || undefined,
          saveAsDraft: true,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["source-content"] });
      queryClient.invalidateQueries({ queryKey: ["posts", channelId] });

      // Clear selection and close modal
      clearSelection();
      onOpenChange(false);
      setAdditionalInstructions("");

      // Navigate to channel page to see the new draft
      router.push(`/channels/${channelId}`);
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const count = selectedIds.size;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>{t("sources.generateFromSelected")}</ModalTitle>
          <ModalDescription>
            {t("sources.selected", { count })}
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4">
          {/* Selected content preview */}
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)]">
            <FileText className="h-5 w-5 text-[var(--text-tertiary)]" />
            <span className="text-sm text-[var(--text-secondary)]">
              {count} {count === 1 ? "post" : "posts"} selected for inspiration
            </span>
          </div>

          {/* Additional instructions */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Additional instructions (optional)
            </label>
            <Textarea
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="E.g., Focus on the key points, make it more engaging..."
              className="min-h-[80px]"
            />
          </div>

          {generateMutation.isError && (
            <p className="text-sm text-[var(--status-error)]">
              {generateMutation.error instanceof Error
                ? generateMutation.error.message
                : "Failed to generate content"}
            </p>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={generateMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={count === 0 || generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Spinner size="sm" />
                {t("generate.generating")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t("generate.generate")}
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
