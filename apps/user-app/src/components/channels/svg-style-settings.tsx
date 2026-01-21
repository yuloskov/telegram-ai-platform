// SVG style settings component for channel configuration

import { ChevronDown, ChevronRight, Palette } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "~/components/ui/checkbox";
import { ColorPicker } from "~/components/ui/color-picker";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useI18n } from "~/i18n";

export interface SVGSettings {
  svgEnabled: boolean;
  svgStylePrompt: string;
  svgThemeColor: string;
  svgTextColor: string;
  svgBackgroundStyle: string;
  svgFontStyle: string;
}

interface SVGStyleSettingsProps {
  settings: SVGSettings;
  onSettingsChange: (settings: SVGSettings) => void;
}

export function SVGStyleSettings({ settings, onSettingsChange }: SVGStyleSettingsProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(settings.svgEnabled);

  const updateField = <K extends keyof SVGSettings>(field: K, value: SVGSettings[K]) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  return (
    <div className="border border-[var(--border-primary)] rounded-[var(--radius-lg)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Palette className="h-5 w-5 text-[var(--accent-primary)]" />
          <span className="font-medium text-[var(--text-primary)]">
            {t("svg.title")}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-[var(--text-secondary)]" />
        ) : (
          <ChevronRight className="h-5 w-5 text-[var(--text-secondary)]" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-5 border-t border-[var(--border-primary)]">
          {/* Enable toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={settings.svgEnabled}
              onCheckedChange={(checked) => updateField("svgEnabled", !!checked)}
            />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {t("svg.enableLabel")}
            </span>
          </label>

          {settings.svgEnabled && (
            <>
              {/* Style prompt */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t("svg.stylePromptLabel")}
                </label>
                <Textarea
                  value={settings.svgStylePrompt}
                  onChange={(e) => updateField("svgStylePrompt", e.target.value)}
                  placeholder={t("svg.stylePromptPlaceholder")}
                  rows={2}
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  {t("svg.stylePromptHint")}
                </p>
              </div>

              {/* Theme color */}
              <ColorPicker
                value={settings.svgThemeColor}
                onChange={(color) => updateField("svgThemeColor", color)}
                label={t("svg.themeColorLabel")}
              />

              {/* Text color */}
              <ColorPicker
                value={settings.svgTextColor}
                onChange={(color) => updateField("svgTextColor", color)}
                label={t("svg.textColorLabel")}
              />

              {/* Background style */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t("svg.backgroundStyleLabel")}
                </label>
                <Select
                  value={settings.svgBackgroundStyle}
                  onValueChange={(value) => updateField("svgBackgroundStyle", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">
                      {t("svg.backgroundStyles.solid")}
                    </SelectItem>
                    <SelectItem value="gradient">
                      {t("svg.backgroundStyles.gradient")}
                    </SelectItem>
                    <SelectItem value="transparent">
                      {t("svg.backgroundStyles.transparent")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Font style */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t("svg.fontStyleLabel")}
                </label>
                <Select
                  value={settings.svgFontStyle}
                  onValueChange={(value) => updateField("svgFontStyle", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">
                      {t("svg.fontStyles.modern")}
                    </SelectItem>
                    <SelectItem value="classic">
                      {t("svg.fontStyles.classic")}
                    </SelectItem>
                    <SelectItem value="playful">
                      {t("svg.fontStyles.playful")}
                    </SelectItem>
                    <SelectItem value="technical">
                      {t("svg.fontStyles.technical")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
