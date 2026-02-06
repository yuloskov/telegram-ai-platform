import { useState, useEffect } from "react";
import { Settings, Loader2, Check } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useI18n } from "~/i18n";

interface WebsiteSettingsCardProps {
  maxPages: number;
  stalenessDays: number;
  filterPatterns: string[];
  skipChunking: boolean;
  onSave: (settings: {
    websiteMaxPages: number;
    websiteStalenessDays: number;
    websiteFilterPatterns: string[];
    skipChunking: boolean;
  }) => void;
  isSaving: boolean;
  isCrawling: boolean;
}

export function WebsiteSettingsCard({
  maxPages,
  stalenessDays,
  filterPatterns,
  skipChunking,
  onSave,
  isSaving,
  isCrawling,
}: WebsiteSettingsCardProps) {
  const { t } = useI18n();

  const [localMaxPages, setLocalMaxPages] = useState(maxPages);
  const [localStalenessDays, setLocalStalenessDays] = useState(stalenessDays);
  const [localFilterPatterns, setLocalFilterPatterns] = useState(filterPatterns.join("\n"));
  const [localSkipChunking, setLocalSkipChunking] = useState(skipChunking);
  const [saved, setSaved] = useState(false);

  // Sync with props when source data refreshes
  useEffect(() => {
    setLocalMaxPages(maxPages);
    setLocalStalenessDays(stalenessDays);
    setLocalFilterPatterns(filterPatterns.join("\n"));
    setLocalSkipChunking(skipChunking);
  }, [maxPages, stalenessDays, filterPatterns, skipChunking]);

  const hasChanges =
    localMaxPages !== maxPages ||
    localStalenessDays !== stalenessDays ||
    localFilterPatterns !== filterPatterns.join("\n") ||
    localSkipChunking !== skipChunking;

  const handleSave = () => {
    const patterns = localFilterPatterns
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    onSave({
      websiteMaxPages: localMaxPages,
      websiteStalenessDays: localStalenessDays,
      websiteFilterPatterns: patterns,
      skipChunking: localSkipChunking,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4 text-[var(--text-secondary)]" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          {t("sources.websiteSettings")}
        </h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t("sources.maxPages")}
            </label>
            <Input
              type="number"
              min={1}
              max={500}
              value={localMaxPages}
              onChange={(e) => setLocalMaxPages(parseInt(e.target.value, 10) || 50)}
              disabled={isCrawling}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t("sources.stalenessDays")}
            </label>
            <Input
              type="number"
              min={1}
              max={365}
              value={localStalenessDays}
              onChange={(e) => setLocalStalenessDays(parseInt(e.target.value, 10) || 30)}
              disabled={isCrawling}
            />
            <p className="text-xs text-[var(--text-tertiary)]">{t("sources.stalenessDaysHint")}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            {t("sources.filterPatterns")}
          </label>
          <Textarea
            value={localFilterPatterns}
            onChange={(e) => setLocalFilterPatterns(e.target.value)}
            placeholder="/blog/draft/\n/internal/"
            rows={3}
            className="text-sm"
            disabled={isCrawling}
          />
          <p className="text-xs text-[var(--text-tertiary)]">{t("sources.filterPatternsHint")}</p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={localSkipChunking}
            onChange={(e) => setLocalSkipChunking(e.target.checked)}
            className="h-4 w-4 shrink-0 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
            disabled={isCrawling}
          />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {t("sources.skipChunking")}
          </span>
        </label>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || isCrawling}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("sources.savingSettings")}
              </>
            ) : (
              t("sources.saveSettings")
            )}
          </Button>
          {saved && !hasChanges && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <Check className="h-3 w-3" />
              {t("sources.settingsSaved")}
            </span>
          )}
        </div>

        {saved && !hasChanges && (
          <p className="text-xs text-[var(--text-tertiary)]">
            {t("sources.settingsSavedRecrawlHint")}
          </p>
        )}
      </div>
    </Card>
  );
}
