// Channel settings form component

import { AlertCircle, Check, Save } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useI18n } from "~/i18n";

export interface ChannelSettings {
  niche: string;
  tone: string;
  language: string;
  hashtags: string;
}

interface ChannelSettingsFormProps {
  settings: ChannelSettings;
  onSettingsChange: (settings: ChannelSettings) => void;
  onSave: () => void;
  isSaving: boolean;
  isError: boolean;
  errorMessage?: string;
  showSuccess: boolean;
}

export function ChannelSettingsForm({
  settings,
  onSettingsChange,
  onSave,
  isSaving,
  isError,
  errorMessage,
  showSuccess,
}: ChannelSettingsFormProps) {
  const { t } = useI18n();

  const updateField = <K extends keyof ChannelSettings>(
    field: K,
    value: ChannelSettings[K]
  ) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Niche */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          {t("channelSettings.nicheLabel")}
        </label>
        <Input
          value={settings.niche}
          onChange={(e) => updateField("niche", e.target.value)}
          placeholder={t("channelSettings.nichePlaceholder")}
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          {t("channelSettings.nicheHint")}
        </p>
      </div>

      {/* Tone */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          {t("channelSettings.toneLabel")}
        </label>
        <Select
          value={settings.tone}
          onValueChange={(value) => updateField("tone", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">
              {t("channelSettings.toneProfessional")}
            </SelectItem>
            <SelectItem value="casual">
              {t("channelSettings.toneCasual")}
            </SelectItem>
            <SelectItem value="humorous">
              {t("channelSettings.toneHumorous")}
            </SelectItem>
            <SelectItem value="informative">
              {t("channelSettings.toneInformative")}
            </SelectItem>
            <SelectItem value="inspirational">
              {t("channelSettings.toneInspirational")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Language */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          {t("channelSettings.contentLanguageLabel")}
        </label>
        <Select
          value={settings.language}
          onValueChange={(value) => updateField("language", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">
              {t("channelSettings.contentLanguageEnglish")}
            </SelectItem>
            <SelectItem value="ru">
              {t("channelSettings.contentLanguageRussian")}
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          {t("channelSettings.contentLanguageHint")}
        </p>
      </div>

      {/* Hashtags */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          {t("channelSettings.hashtagsLabel")}
        </label>
        <Input
          value={settings.hashtags}
          onChange={(e) => updateField("hashtags", e.target.value)}
          placeholder={t("channelSettings.hashtagsPlaceholder")}
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          {t("channelSettings.hashtagsHint")}
        </p>
      </div>

      {/* Error */}
      {isError && (
        <div className="flex items-start gap-3 bg-[#f8d7da] text-[#721c24] p-4 rounded-[var(--radius-md)]">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            {errorMessage || t("channelSettings.saveError")}
          </p>
        </div>
      )}

      {/* Success */}
      {showSuccess && (
        <div className="flex items-center gap-3 bg-[#d4edda] text-[#155724] p-4 rounded-[var(--radius-md)]">
          <Check className="h-5 w-5" />
          <p className="text-sm">{t("channelSettings.saveSuccess")}</p>
        </div>
      )}

      {/* Save Button */}
      <Button onClick={onSave} disabled={isSaving} className="w-full">
        {isSaving ? (
          <>
            <Spinner size="sm" />
            {t("channelSettings.saving")}
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            {t("channelSettings.save")}
          </>
        )}
      </Button>
    </div>
  );
}
