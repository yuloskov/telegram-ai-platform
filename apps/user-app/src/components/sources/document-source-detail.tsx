import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, RefreshCw, Trash2, Loader2, Settings } from "lucide-react";
import { PageHeader } from "~/components/layout/header";
import { PageSection } from "~/components/layout/page-layout";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { ConfirmModal } from "~/components/ui/confirm-modal";
import { DocumentChunksList } from "~/components/sources/document-chunks-list";
import { GenerationActionBar } from "~/components/sources/generation-action-bar";
import { GenerateFromScrapedModal } from "~/components/sources/generate-from-scraped-modal";
import { useContentSelectionStore } from "~/stores/content-selection-store";
import { useI18n } from "~/i18n";
import type { useSourceDetail } from "~/hooks/useSourceDetail";

interface Channel {
  id: string;
  title: string;
}

interface DocumentSourceDetailProps {
  channel: Channel;
  channelId: string;
  sourceId: string;
  sourceDetail: ReturnType<typeof useSourceDetail>;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentSourceDetail({
  channel,
  channelId,
  sourceId,
  sourceDetail,
}: DocumentSourceDetailProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { selectedIds, clearSelection } = useContentSelectionStore();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [chunkingPrompt, setChunkingPrompt] = useState("");
  const [promptSaved, setPromptSaved] = useState(true);

  const {
    source,
    content,
    pagination,
    contentLoading,
    page,
    setPage,
    deleteMutation,
    regenerateMutation,
    updateSourceMutation,
  } = sourceDetail;

  // Sync prompt with source
  useEffect(() => {
    if (source?.chunkingPrompt !== undefined) {
      setChunkingPrompt(source.chunkingPrompt ?? "");
    }
  }, [source?.chunkingPrompt]);

  const handlePromptChange = (value: string) => {
    setChunkingPrompt(value);
    setPromptSaved(value === (source?.chunkingPrompt ?? ""));
  };

  const handleSavePrompt = async () => {
    await updateSourceMutation.mutateAsync({
      chunkingPrompt: chunkingPrompt || null,
    });
    setPromptSaved(true);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsBulkDeleting(true);
    try {
      const res = await fetch(
        `/api/channels/${channelId}/sources/${sourceId}/content/bulk-delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: Array.from(selectedIds) }),
        }
      );
      const data = await res.json();
      if (data.success) {
        clearSelection();
        queryClient.invalidateQueries({ queryKey: ["source-content", channelId, sourceId] });
        queryClient.invalidateQueries({ queryKey: ["source", channelId, sourceId] });
      }
    } catch (error) {
      console.error("Failed to delete chunks:", error);
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteConfirmOpen(false);
    }
  };

  // Poll for processing completion
  const isProcessing = source && !source.lastScrapedAt;
  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["source", channelId, sourceId] });
      queryClient.invalidateQueries({ queryKey: ["source-content", channelId, sourceId] });
    }, 3000);

    return () => clearInterval(interval);
  }, [isProcessing, queryClient, channelId, sourceId]);

  if (!source) return null;

  const documentName = source.documentName ?? t("sources.document");

  return (
    <>
      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
        <PageHeader
          title={documentName}
          breadcrumbs={[
            { label: t("common.home"), href: "/" },
            { label: t("nav.channels"), href: "/channels" },
            { label: channel.title, href: `/channels/${channelId}` },
            { label: t("sources.title"), href: `/channels/${channelId}/sources` },
            { label: documentName },
          ]}
          actions={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setRegenerateConfirmOpen(true)}
                disabled={regenerateMutation.isPending || isProcessing}
              >
                {regenerateMutation.isPending || isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isProcessing ? t("sources.processing") : t("sources.regenerating")}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    {t("sources.regenerateChunks")}
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        {/* Document Info Card */}
        <Card className="p-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
              <FileText className="h-8 w-8 text-[var(--text-secondary)]" />
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">
                  {t("sources.fileSize")}
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {formatFileSize(source.documentSize)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">
                  {t("sources.chunksCount")}
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {source._count.scrapedContent}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">
                  {t("sources.parsedAt")}
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {source.lastScrapedAt
                    ? new Date(source.lastScrapedAt).toLocaleDateString()
                    : t("sources.notParsedYet")}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Chunking Prompt Settings */}
        <Card className="p-4 mb-6">
          <button
            type="button"
            onClick={() => setPromptExpanded(!promptExpanded)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {t("sources.chunkingPromptTitle")}
              </span>
              {!promptSaved && (
                <span className="text-xs text-[var(--warning)]">
                  ({t("common.unsaved")})
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--text-tertiary)]">
              {promptExpanded ? "−" : "+"}
            </span>
          </button>

          {promptExpanded && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                {t("sources.chunkingPromptDescription")}
              </p>
              <Textarea
                value={chunkingPrompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder={t("sources.chunkingPromptPlaceholder")}
                rows={6}
                className="text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setChunkingPrompt(source?.chunkingPrompt ?? "");
                    setPromptSaved(true);
                  }}
                  disabled={promptSaved}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSavePrompt}
                  disabled={promptSaved || updateSourceMutation.isPending}
                >
                  {updateSourceMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    t("common.save")
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Processing indicator */}
        {isProcessing && (
          <Card className="p-4 mb-6 border-[var(--primary)] bg-[var(--primary)]/5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {t("sources.processing")}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("sources.regenerateDescription")}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Chunks List */}
        <PageSection title={t("sources.documentChunks")}>
          <DocumentChunksList
            chunks={content}
            isLoading={contentLoading}
            channelId={channelId}
            sourceId={sourceId}
            onChunkDeleted={() => {
              queryClient.invalidateQueries({ queryKey: ["source-content", channelId, sourceId] });
              queryClient.invalidateQueries({ queryKey: ["source", channelId, sourceId] });
            }}
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t("common.back")}
              </Button>
              <span className="text-sm text-[var(--text-secondary)]">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                {t("common.next")}
              </Button>
            </div>
          )}
        </PageSection>
      </div>

      <GenerationActionBar
        onGenerate={() => setGenerateModalOpen(true)}
        onDelete={() => setBulkDeleteConfirmOpen(true)}
        isDeleting={isBulkDeleting}
      />

      <GenerateFromScrapedModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        channelId={channelId}
      />

      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t("sources.deleteConfirmTitle")}
        description={t("sources.deleteConfirmDescription")}
        confirmLabel={t("common.delete")}
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />

      <ConfirmModal
        open={regenerateConfirmOpen}
        onOpenChange={setRegenerateConfirmOpen}
        title={t("sources.regenerateChunks")}
        description={t("sources.regenerateDescription")}
        confirmLabel={t("common.confirm")}
        onConfirm={() => {
          regenerateMutation.mutate();
          setRegenerateConfirmOpen(false);
        }}
        isLoading={regenerateMutation.isPending}
      />

      <ConfirmModal
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
        title={t("sources.deleteSelectedTitle")}
        description={t("sources.deleteSelectedDescription", { count: selectedIds.size })}
        confirmLabel={t("common.delete")}
        onConfirm={handleBulkDelete}
        isLoading={isBulkDeleting}
        variant="danger"
      />
    </>
  );
}
