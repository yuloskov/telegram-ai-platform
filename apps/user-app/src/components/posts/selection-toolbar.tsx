import { Trash2, Send, X, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";

interface SelectionToolbarProps {
  selectedCount: number;
  canPublish: boolean;
  canDelete: boolean;
  onPublish: () => void;
  onDelete: () => void;
  onClear: () => void;
  isPublishing?: boolean;
  isDeleting?: boolean;
}

export function SelectionToolbar({
  selectedCount,
  canPublish,
  canDelete,
  onPublish,
  onDelete,
  onClear,
  isPublishing = false,
  isDeleting = false,
}: SelectionToolbarProps) {
  const { t } = useI18n();
  const isLoading = isPublishing || isDeleting;

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-lg">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {t("selection.selectedCount", { count: selectedCount })}
        </span>

        <div className="w-px h-5 bg-[var(--border-primary)]" />

        <div className="flex items-center gap-2">
          {canPublish && (
            <Button
              size="sm"
              onClick={onPublish}
              disabled={isLoading}
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t("posts.publish")}
            </Button>
          )}

          {canDelete && (
            <Button
              size="sm"
              variant="danger"
              onClick={onDelete}
              disabled={isLoading}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("common.delete")}
            </Button>
          )}
        </div>

        <div className="w-px h-5 bg-[var(--border-primary)]" />

        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
          {t("selection.clear")}
        </Button>
      </div>
    </div>
  );
}
