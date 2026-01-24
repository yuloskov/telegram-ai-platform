import type { ReactNode } from "react";
import { FileText, Shuffle } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { EmptyState } from "~/components/telegram/empty-state";
import { useI18n } from "~/i18n";

interface ContentListProps {
  children: ReactNode;
  itemIds: string[];
  selectedIds: Set<string>;
  isLoading?: boolean;
  selectionEnabled?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
  onSelectAll?: (ids: string[]) => void;
  onSelectRandom?: (ids: string[], count: number) => void;
}

export function ContentList({
  children,
  itemIds,
  selectedIds,
  isLoading = false,
  selectionEnabled = false,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onSelectAll,
  onSelectRandom,
}: ContentListProps) {
  const { t } = useI18n();

  const handleSelectAll = () => {
    if (!onSelectAll) return;
    const allSelected = itemIds.length > 0 && itemIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      onSelectAll([]);
    } else {
      onSelectAll(itemIds);
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

  if (itemIds.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<FileText className="h-8 w-8 text-[var(--text-tertiary)]" />}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </Card>
    );
  }

  const allSelected = itemIds.length > 0 && itemIds.every((id) => selectedIds.has(id));
  const someSelected = itemIds.some((id) => selectedIds.has(id));

  return (
    <div className="space-y-3">
      {/* Select All Header */}
      {selectionEnabled && itemIds.length > 0 && (
        <div className="flex items-center gap-4 px-1 py-2">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={handleSelectAll}
              data-checkbox
            />
            <span className="text-sm text-[var(--text-secondary)]">
              {t("sources.selectAll")}
            </span>
          </div>
          {onSelectRandom && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSelectRandom(itemIds, 5)}
              disabled={itemIds.length === 0}
            >
              <Shuffle className="h-4 w-4 mr-1" />
              {t("sources.selectRandom", { count: 5 })}
            </Button>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
