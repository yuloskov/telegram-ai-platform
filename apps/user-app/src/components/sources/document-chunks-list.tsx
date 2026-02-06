import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, CheckCircle, Trash2, Shuffle } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Spinner } from "~/components/ui/spinner";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { ConfirmModal } from "~/components/ui/confirm-modal";
import { useContentSelectionStore } from "~/stores/content-selection-store";
import { useI18n } from "~/i18n";

interface DocumentChunk {
  id: string;
  chunkIndex: number | null;
  sectionTitle: string | null;
  text: string | null;
  usedForGeneration: boolean;
}

interface DocumentChunksListProps {
  chunks: DocumentChunk[];
  isLoading: boolean;
  channelId: string;
  sourceId: string;
  selectionEnabled?: boolean;
  onChunkDeleted?: () => void;
}

const MAX_PREVIEW_LENGTH = 200;

function ChunkCard({
  chunk,
  selected,
  selectionEnabled,
  onSelect,
  onDelete,
}: {
  chunk: DocumentChunk;
  selected: boolean;
  selectionEnabled: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const text = chunk.text ?? "";
  const shouldTruncate = text.length > MAX_PREVIEW_LENGTH;
  const displayText = expanded || !shouldTruncate ? text : text.slice(0, MAX_PREVIEW_LENGTH) + "...";

  return (
    <Card
      className={`p-4 transition-colors ${selected ? "ring-2 ring-[var(--primary)]" : ""}`}
    >
      <div className="flex items-start gap-3">
        {selectionEnabled && (
          <div className="pt-0.5">
            <Checkbox
              checked={selected}
              onCheckedChange={() => onSelect(chunk.id)}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--bg-tertiary)] text-xs font-medium text-[var(--text-secondary)]">
              {chunk.chunkIndex ?? "?"}
            </span>
            {chunk.sectionTitle && (
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {chunk.sectionTitle}
              </span>
            )}
            {chunk.usedForGeneration && (
              <Badge variant="info" icon={<CheckCircle className="h-3 w-3" />}>
                {t("sources.usedBadge")}
              </Badge>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => onDelete(chunk.id)}
              className="p-1 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
              title={t("sources.deleteChunk")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words">
            {displayText}
          </p>

          {/* Expand/collapse button */}
          {shouldTruncate && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-2 text-xs text-[var(--primary)] hover:underline"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  {t("sources.showLess")}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  {t("sources.showMore")}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function DocumentChunksList({
  chunks,
  isLoading,
  channelId,
  sourceId,
  selectionEnabled = true,
  onChunkDeleted,
}: DocumentChunksListProps) {
  const { t } = useI18n();
  const { selectedIds, toggleSelection, selectAll, selectRandom, setSourceId, isSelected } =
    useContentSelectionStore();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [chunkToDelete, setChunkToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setSourceId(sourceId);
  }, [sourceId, setSourceId]);

  const handleDeleteClick = (chunkId: string) => {
    setChunkToDelete(chunkId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!chunkToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/channels/${channelId}/sources/${sourceId}/content/${chunkToDelete}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        onChunkDeleted?.();
      }
    } catch (error) {
      console.error("Failed to delete chunk:", error);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setChunkToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-tertiary)]">{t("sources.noChunks")}</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {t("sources.noChunksDescription")}
        </p>
      </div>
    );
  }

  const itemIds = chunks.map((c) => c.id);
  const allSelected = itemIds.length > 0 && itemIds.every((id) => selectedIds.has(id));
  const someSelected = itemIds.some((id) => selectedIds.has(id));

  return (
    <div className="space-y-4">
      {/* Selection controls */}
      {selectionEnabled && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={() => selectAll(itemIds)}
              />
              <span className="text-sm text-[var(--text-secondary)]">
                {t("sources.selectAll")}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectRandom(itemIds, 5)}
              disabled={itemIds.length === 0}
            >
              <Shuffle className="h-4 w-4 mr-1" />
              {t("sources.selectRandom", { count: 5 })}
            </Button>
          </div>
          {selectedIds.size > 0 && (
            <span className="text-sm text-[var(--text-secondary)]">
              {t("sources.selected", { count: selectedIds.size })}
            </span>
          )}
        </div>
      )}

      {/* Chunk list */}
      <div className="space-y-3">
        {chunks.map((chunk) => (
          <ChunkCard
            key={chunk.id}
            chunk={chunk}
            selected={isSelected(chunk.id)}
            selectionEnabled={selectionEnabled}
            onSelect={toggleSelection}
            onDelete={handleDeleteClick}
          />
        ))}
      </div>

      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t("sources.deleteChunkTitle")}
        description={t("sources.deleteChunkDescription")}
        confirmLabel={t("common.delete")}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
