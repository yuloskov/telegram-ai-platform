import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useI18n } from "~/i18n";

interface PersonaDescriptionFormProps {
  personaName: string;
  personaDescription: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (desc: string) => void;
}

export function PersonaDescriptionForm({
  personaName,
  personaDescription,
  onNameChange,
  onDescriptionChange,
}: PersonaDescriptionFormProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          {t("persona.nameLabel")}
        </label>
        <Input
          value={personaName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t("persona.namePlaceholder")}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          {t("persona.descriptionLabel")}
        </label>
        <Textarea
          value={personaDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t("persona.descriptionPlaceholder")}
          className="min-h-[120px]"
        />
      </div>
    </div>
  );
}
