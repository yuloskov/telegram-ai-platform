import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { ConfirmModal } from "~/components/ui/confirm-modal";
import { EmptyState } from "~/components/telegram/empty-state";
import { SourceCard } from "./source-card";
import { useI18n } from "~/i18n";

interface ContentSource {
  id: string;
  sourceType: "telegram" | "document";
  telegramUsername: string | null;
  documentName: string | null;
  documentSize: number | null;
  isActive: boolean;
  lastScrapedAt: string | null;
  _count: {
    scrapedContent: number;
  };
}

interface SourceListProps {
  sources: ContentSource[];
  channelId: string;
  isLoading: boolean;
  onDelete: (sourceId: string) => void;
  onOpenAddModal: () => void;
}

export function SourceList({
  sources,
  channelId,
  isLoading,
  onDelete,
  onOpenAddModal,
}: SourceListProps) {
  const { t } = useI18n();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<string | null>(null);

  const handleDeleteClick = (sourceId: string) => {
    setSourceToDelete(sourceId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (sourceToDelete) {
      onDelete(sourceToDelete);
      setDeleteConfirmOpen(false);
      setSourceToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-8 flex items-center justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  if (sources.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Lightbulb className="h-8 w-8 text-[var(--text-tertiary)]" />}
          title={t("sources.noSources")}
          description={t("sources.noSourcesDescription")}
          action={
            <Button onClick={onOpenAddModal}>
              {t("sources.addSource")}
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sources.map((source) => (
        <SourceCard
          key={source.id}
          source={source}
          channelId={channelId}
          onDelete={handleDeleteClick}
        />
      ))}

      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t("sources.deleteConfirmTitle")}
        description={t("sources.deleteConfirmDescription")}
        confirmLabel={t("common.delete")}
        onConfirm={handleConfirmDelete}
        variant="danger"
      />
    </div>
  );
}
