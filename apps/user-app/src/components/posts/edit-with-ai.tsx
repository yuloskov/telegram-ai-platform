import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Spinner } from "~/components/ui/spinner";
import { useI18n } from "~/i18n";

interface EditWithAIProps {
  onEdit: (instruction: string) => void;
  isEditing: boolean;
  disabled?: boolean;
}

export function EditWithAI({ onEdit, isEditing, disabled }: EditWithAIProps) {
  const { t } = useI18n();
  const [instruction, setInstruction] = useState("");

  const handleEdit = () => {
    if (!instruction.trim()) return;
    onEdit(instruction.trim());
    setInstruction("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
        <Wand2 className="h-4 w-4" />
        {t("postEditor.editWithAI")}
      </div>

      <Textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder={t("postEditor.editWithAIPlaceholder")}
        className="min-h-[60px]"
        disabled={disabled || isEditing}
      />

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleEdit}
          disabled={disabled || isEditing || !instruction.trim()}
        >
          {isEditing ? (
            <>
              <Spinner size="sm" />
              {t("postEditor.applying")}
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              {t("postEditor.applyChanges")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
