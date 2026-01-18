import { Check, AlertCircle } from "lucide-react";
import { Card } from "~/components/ui/card";
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

interface ChannelInfo {
  id: number;
  title: string;
  username?: string;
}

interface ChannelSettings {
  niche: string;
  tone: string;
  language: string;
  hashtags: string;
}

interface ConfigureChannelStepProps {
  channelInfo: ChannelInfo;
  settings: ChannelSettings;
  onSettingsChange: (settings: ChannelSettings) => void;
  onBack: () => void;
  onCreate: () => void;
  isCreating: boolean;
  error?: Error | null;
}

export function ConfigureChannelStep({
  channelInfo,
  settings,
  onSettingsChange,
  onBack,
  onCreate,
  isCreating,
  error,
}: ConfigureChannelStepProps) {
  const { t } = useI18n();

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
        {t("addChannel.step2Title")}
      </h2>

      {/* Success banner */}
      <div className="flex items-center gap-3 bg-[#d4edda] rounded-[var(--radius-md)] p-4 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#155724]">
          <Check className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-medium text-[#155724]">{channelInfo.title}</p>
          {channelInfo.username && (
            <p className="text-sm text-[#155724]/80">@{channelInfo.username}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            {t("addChannel.nicheLabel")}
          </label>
          <Input
            value={settings.niche}
            onChange={(e) =>
              onSettingsChange({ ...settings, niche: e.target.value })
            }
            placeholder={t("addChannel.nichePlaceholder")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            {t("addChannel.toneLabel")}
          </label>
          <Select
            value={settings.tone}
            onValueChange={(value) =>
              onSettingsChange({ ...settings, tone: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">{t("addChannel.toneProfessional")}</SelectItem>
              <SelectItem value="casual">{t("addChannel.toneCasual")}</SelectItem>
              <SelectItem value="humorous">{t("addChannel.toneHumorous")}</SelectItem>
              <SelectItem value="informative">{t("addChannel.toneInformative")}</SelectItem>
              <SelectItem value="inspirational">{t("addChannel.toneInspirational")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            {t("addChannel.contentLanguageLabel")}
          </label>
          <Select
            value={settings.language}
            onValueChange={(value) =>
              onSettingsChange({ ...settings, language: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("addChannel.contentLanguageEnglish")}</SelectItem>
              <SelectItem value="ru">{t("addChannel.contentLanguageRussian")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            {t("addChannel.hashtagsLabel")}
          </label>
          <Input
            value={settings.hashtags}
            onChange={(e) =>
              onSettingsChange({ ...settings, hashtags: e.target.value })
            }
            placeholder={t("addChannel.hashtagsPlaceholder")}
          />
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-[#f8d7da] text-[#721c24] p-4 rounded-[var(--radius-md)]">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error.message || t("addChannel.failedToCreate")}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onBack} className="flex-1">
            {t("common.back")}
          </Button>
          <Button onClick={onCreate} disabled={isCreating} className="flex-1">
            {isCreating ? (
              <>
                <Spinner size="sm" />
                {t("addChannel.creating")}
              </>
            ) : (
              t("addChannel.title")
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
