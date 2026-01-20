import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { useI18n } from "~/i18n";

interface AutoScrapeSettingsProps {
  channelId: string;
  sourceId: string;
}

interface AutoScrapeConfig {
  autoScrapeEnabled: boolean;
  scrapeInterval: string | null;
}

export function AutoScrapeSettings({ channelId, sourceId }: AutoScrapeSettingsProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["auto-scrape-config", channelId, sourceId],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}/auto-scrape`);
      const json = await res.json();
      return json.data as AutoScrapeConfig;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AutoScrapeConfig) => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}/auto-scrape`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as AutoScrapeConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-scrape-config", channelId, sourceId] });
    },
  });

  const handleToggle = (enabled: boolean) => {
    updateMutation.mutate({
      autoScrapeEnabled: enabled,
      scrapeInterval: enabled ? (config?.scrapeInterval || "daily") : null,
    });
  };

  const handleIntervalChange = (interval: string) => {
    updateMutation.mutate({
      autoScrapeEnabled: true,
      scrapeInterval: interval,
    });
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Settings className="h-5 w-5 text-[var(--text-tertiary)]" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          {t("sources.autoScrape")}
        </h3>
      </div>

      <div className="space-y-4">
        {/* Enable toggle */}
        <div className="flex items-center gap-3">
          <Checkbox
            checked={config?.autoScrapeEnabled ?? false}
            onCheckedChange={(checked) => handleToggle(checked as boolean)}
            disabled={updateMutation.isPending}
          />
          <span className="text-sm text-[var(--text-secondary)]">
            {config?.autoScrapeEnabled
              ? t("sources.autoScrapeEnabled")
              : t("sources.autoScrapeDisabled")}
          </span>
        </div>

        {/* Schedule selector */}
        {config?.autoScrapeEnabled && (
          <div className="ml-8">
            <label className="block text-xs text-[var(--text-tertiary)] mb-1">
              {t("sources.autoScrapeSchedule")}
            </label>
            <Select
              value={config.scrapeInterval || "daily"}
              onValueChange={handleIntervalChange}
              disabled={updateMutation.isPending}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">{t("sources.scheduleHourly")}</SelectItem>
                <SelectItem value="daily">{t("sources.scheduleDaily")}</SelectItem>
                <SelectItem value="weekly">{t("sources.scheduleWeekly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </Card>
  );
}
