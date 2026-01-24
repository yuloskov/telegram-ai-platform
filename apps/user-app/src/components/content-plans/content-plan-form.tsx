// Form component for creating/editing content plans

import { useState } from "react";
import { useRouter } from "next/router";
import { Save } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { CronSchedulePicker } from "./cron-schedule-picker";
import { ImageTypeToggle, type ImageType } from "~/components/generate/image-type-toggle";
import { SVGSettingsInline } from "~/components/generate/svg-settings-inline";
import { useI18n } from "~/i18n";
import type { ContentPlan, CreateContentPlanInput } from "~/hooks/useContentPlan";
import type { SvgGenerationSettings } from "~/hooks/useSvgSettings";

interface ContentSource {
  id: string;
  telegramUsername: string;
}

interface ContentPlanFormProps {
  initialData?: ContentPlan;
  availableSources: ContentSource[];
  onSubmit: (data: CreateContentPlanInput) => void;
  isSubmitting: boolean;
  submitLabel?: string;
}

export function ContentPlanForm({
  initialData,
  availableSources,
  onSubmit,
  isSubmitting,
  submitLabel,
}: ContentPlanFormProps) {
  const { t } = useI18n();
  const router = useRouter();

  // Form state
  const [name, setName] = useState(initialData?.name ?? "");
  const [promptTemplate, setPromptTemplate] = useState(initialData?.promptTemplate ?? "");
  const [cronSchedule, setCronSchedule] = useState(initialData?.cronSchedule ?? "0 9 * * *");
  const [timezone, setTimezone] = useState(initialData?.timezone ?? "UTC");
  const [publishMode, setPublishMode] = useState<"auto_publish" | "review_first" | "draft_only">(
    initialData?.publishMode ?? "review_first"
  );
  const [imageEnabled, setImageEnabled] = useState(initialData?.imageEnabled ?? true);
  const [imageType, setImageType] = useState<ImageType>(
    (initialData?.imageType as ImageType) ?? "svg"
  );
  const [svgSettings, setSvgSettings] = useState<SvgGenerationSettings>({
    themeColor: initialData?.svgThemeColor ?? "#3B82F6",
    textColor: "#1F2937", // Not stored in DB but required by type
    backgroundStyle: (initialData?.svgBackgroundStyle as SvgGenerationSettings["backgroundStyle"]) ?? "gradient",
    fontStyle: (initialData?.svgFontStyle as SvgGenerationSettings["fontStyle"]) ?? "modern",
    stylePrompt: initialData?.svgStylePrompt ?? "",
  });
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(
    initialData?.contentSources.map((s) => s.contentSourceId) ?? []
  );
  const [lookbackPostCount, setLookbackPostCount] = useState(
    initialData?.lookbackPostCount ?? 50
  );
  const [selectionStrategy, setSelectionStrategy] = useState<"recent" | "random">(
    initialData?.selectionStrategy ?? "recent"
  );
  const [selectionCount, setSelectionCount] = useState(
    initialData?.selectionCount ?? 5
  );

  const updateSvgSetting = <K extends keyof SvgGenerationSettings>(
    key: K,
    value: SvgGenerationSettings[K]
  ) => {
    setSvgSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      name,
      promptTemplate,
      cronSchedule,
      timezone,
      publishMode,
      selectionStrategy,
      selectionCount,
      imageEnabled,
      imageType,
      svgThemeColor: svgSettings.themeColor,
      svgBackgroundStyle: svgSettings.backgroundStyle,
      svgFontStyle: svgSettings.fontStyle,
      svgStylePrompt: svgSettings.stylePrompt || null,
      lookbackPostCount,
      contentSourceIds: selectedSourceIds,
    });
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const isValid = name.trim().length > 0 && promptTemplate.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
          {t("contentPlans.planName")}
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t("contentPlans.planName")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("contentPlans.planNamePlaceholder")}
            />
            <p className="text-xs text-[var(--text-tertiary)]">
              {t("contentPlans.planNameHint")}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t("contentPlans.promptTemplate")}
            </label>
            <Textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              placeholder={t("contentPlans.promptTemplatePlaceholder")}
              rows={4}
            />
            <p className="text-xs text-[var(--text-tertiary)]">
              {t("contentPlans.promptTemplateHint")}
            </p>
          </div>
        </div>
      </Card>

      {/* Schedule */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
          {t("contentPlans.scheduleSection")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <CronSchedulePicker value={cronSchedule} onChange={setCronSchedule} />

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-secondary)]">
              {t("contentPlans.timezone")}
            </label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="Europe/Moscow">Europe/Moscow</SelectItem>
                <SelectItem value="Europe/London">Europe/London</SelectItem>
                <SelectItem value="America/New_York">America/New York</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los Angeles</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Publishing Mode */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
          {t("contentPlans.publishingSection")}
        </h3>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            {t("contentPlans.publishMode")}
          </label>
          <div className="space-y-3">
            {(["auto_publish", "review_first", "draft_only"] as const).map((mode) => (
              <label
                key={mode}
                className={`flex items-start gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                  publishMode === mode
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                    : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                }`}
              >
                <input
                  type="radio"
                  name="publishMode"
                  value={mode}
                  checked={publishMode === mode}
                  onChange={() => setPublishMode(mode)}
                  className="mt-1"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {t(`contentPlans.publishModes.${mode}` as const)}
                  </span>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {t(`contentPlans.publishModes.${mode}Description` as const)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Image Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
          {t("contentPlans.imageSection")}
        </h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={imageEnabled}
              onCheckedChange={(checked) => setImageEnabled(checked === true)}
            />
            <div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {t("contentPlans.imageEnabled")}
              </span>
              <p className="text-xs text-[var(--text-tertiary)]">
                {t("contentPlans.imageEnabledHint")}
              </p>
            </div>
          </label>

          {imageEnabled && (
            <div className="space-y-4 mt-4">
              <ImageTypeToggle
                value={imageType}
                onChange={setImageType}
              />

              {imageType === "svg" && (
                <SVGSettingsInline
                  settings={svgSettings}
                  onUpdate={updateSvgSetting}
                />
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Context Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
          {t("contentPlans.contextSection")}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {t("contentPlans.contextHint")}
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t("contentPlans.lookbackPostCount")}
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={100}
                value={lookbackPostCount}
                onChange={(e) => setLookbackPostCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 50)))}
                className="w-24"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                {t("contentPlans.posts")}
              </span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {t("contentPlans.lookbackPostCountHint")}
            </p>
          </div>
        </div>
      </Card>

      {/* Content Sources */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
          {t("contentPlans.sourcesSection")}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {t("contentPlans.sourcesHint")}
        </p>

        {availableSources.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">
            {t("contentPlans.noSourcesSelected")}
          </p>
        ) : (
          <div className="space-y-2">
            {availableSources.map((source) => (
              <label
                key={source.id}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border-primary)] cursor-pointer hover:border-[var(--border-secondary)] transition-colors"
              >
                <Checkbox
                  checked={selectedSourceIds.includes(source.id)}
                  onCheckedChange={() => toggleSource(source.id)}
                />
                <span className="text-sm text-[var(--text-primary)]">
                  @{source.telegramUsername}
                </span>
              </label>
            ))}
          </div>
        )}

        {selectedSourceIds.length > 0 && (
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            {t("contentPlans.sourcesSelectedCount", { count: selectedSourceIds.length })}
          </p>
        )}

        {/* Selection Strategy */}
        {selectedSourceIds.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[var(--border-primary)]">
            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">
              {t("contentPlans.selectionStrategy")}
            </h4>
            <div className="space-y-3">
              {(["recent", "random"] as const).map((strategy) => (
                <label
                  key={strategy}
                  className={`flex items-start gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                    selectionStrategy === strategy
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                      : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="selectionStrategy"
                    value={strategy}
                    checked={selectionStrategy === strategy}
                    onChange={() => setSelectionStrategy(strategy)}
                    className="mt-1"
                  />
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {t(`contentPlans.selectionStrategies.${strategy}` as const)}
                    </span>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {t(`contentPlans.selectionStrategies.${strategy}Description` as const)}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {selectionStrategy === "random" && (
              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  {t("contentPlans.selectionCount")}
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={selectionCount}
                    onChange={(e) => setSelectionCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 5)))}
                    className="w-24"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {t("contentPlans.items")}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {t("contentPlans.selectionCountHint")}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner size="sm" />
              {t("common.loading")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {submitLabel ?? t("common.save")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
