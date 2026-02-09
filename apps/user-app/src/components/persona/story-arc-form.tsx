import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";

interface StoryArcFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    activeDate: string;
    endDate?: string | null;
  }) => void;
  isPending?: boolean;
  onCancel?: () => void;
}

export function StoryArcForm({ onSubmit, isPending, onCancel }: StoryArcFormProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeDate, setActiveDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !activeDate) return;

    onSubmit({
      title,
      description,
      activeDate: new Date(activeDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
    });

    setTitle("");
    setDescription("");
    setActiveDate("");
    setEndDate("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <div>
        <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
          {t("persona.arcTitleLabel")}
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("persona.arcTitlePlaceholder")}
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
          {t("persona.arcDescriptionLabel")}
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("persona.arcDescriptionPlaceholder")}
          className="min-h-[80px]"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            {t("persona.arcActiveDateLabel")}
          </label>
          <Input
            type="date"
            value={activeDate}
            onChange={(e) => setActiveDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            {t("persona.arcEndDateLabel")}
          </label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isPending || !title || !description || !activeDate}>
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {t("persona.addStoryArc")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
