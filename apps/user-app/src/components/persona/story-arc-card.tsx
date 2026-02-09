import { Trash2, CalendarDays } from "lucide-react";
import { Badge, type BadgeVariant } from "~/components/ui/badge";
import { useI18n } from "~/i18n";
import type { StoryArc } from "~/types";

interface StoryArcCardProps {
  arc: StoryArc;
  onDelete: () => void;
}

type ArcStatusKey = "persona.arcStatusUsed" | "persona.arcStatusExpired" | "persona.arcStatusActive" | "persona.arcStatusPending";

function getArcStatus(arc: StoryArc): { key: ArcStatusKey; variant: BadgeVariant } {
  if (arc.isUsed) return { key: "persona.arcStatusUsed", variant: "default" };

  const now = new Date();
  const activeDate = new Date(arc.activeDate);
  const endDate = arc.endDate ? new Date(arc.endDate) : null;

  if (endDate && endDate < now) return { key: "persona.arcStatusExpired", variant: "warning" };
  if (activeDate <= now) return { key: "persona.arcStatusActive", variant: "success" };
  return { key: "persona.arcStatusPending", variant: "info" };
}

export function StoryArcCard({ arc, onDelete }: StoryArcCardProps) {
  const { t } = useI18n();
  const status = getArcStatus(arc);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="group flex items-start gap-3 p-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)]">
      <div className="shrink-0 mt-0.5">
        <CalendarDays className="h-4 w-4 text-[var(--text-tertiary)]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">
            {arc.title}
          </h4>
          <Badge variant={status.variant}>{t(status.key)}</Badge>
        </div>

        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
          {arc.description}
        </p>

        <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--text-tertiary)]">
          <span>{formatDate(arc.activeDate)}</span>
          {arc.endDate && (
            <>
              <span>—</span>
              <span>{formatDate(arc.endDate)}</span>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
