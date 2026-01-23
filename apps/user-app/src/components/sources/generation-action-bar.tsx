import { Sparkles, X, Trash2, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useContentSelectionStore } from "~/stores/content-selection-store";
import { useI18n } from "~/i18n";

interface GenerationActionBarProps {
  onGenerate: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function GenerationActionBar({
  onGenerate,
  onDelete,
  isDeleting,
}: GenerationActionBarProps) {
  const { t } = useI18n();
  const { selectedIds, clearSelection } = useContentSelectionStore();
  const count = selectedIds.size;

  if (count === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-primary)] border-t border-[var(--border-primary)] shadow-lg animate-slide-up">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {t("sources.selected", { count })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="text-[var(--text-secondary)]"
          >
            <X className="h-4 w-4" />
            {t("sources.clearSelection")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <Button
              variant="secondary"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("sources.deleteSelected")}
            </Button>
          )}
          <Button onClick={onGenerate}>
            <Sparkles className="h-4 w-4" />
            {t("sources.generateFromSelected")}
          </Button>
        </div>
      </div>
    </div>
  );
}
