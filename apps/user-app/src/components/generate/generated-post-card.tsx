import { Edit2, Save, Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";
import { useState } from "react";

interface GeneratedPostCardProps {
  content: string;
  angle: string;
  index: number;
  onEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export function GeneratedPostCard({
  content,
  angle,
  index,
  onEdit,
  onSave,
  isSaving,
}: GeneratedPostCardProps) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await onSave();
    setSaved(true);
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-secondary)] bg-[var(--bg-primary)] flex flex-col h-full">
      {/* Content */}
      <div className="p-4 flex-1">
        {angle && (
          <span className="inline-block text-xs px-2 py-0.5 mb-3 rounded-full bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)]">
            {angle}
          </span>
        )}
        <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
          {content}
        </p>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-[var(--border-secondary)] flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8"
          title={t("common.edit")}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant={saved ? "ghost" : "default"}
          size="sm"
          onClick={handleSave}
          disabled={isSaving || saved}
          className="min-w-[80px]"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              {t("generatePage.saved")}
            </>
          ) : isSaving ? (
            t("postEditor.saving")
          ) : (
            <>
              <Save className="h-4 w-4" />
              {t("common.save")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
