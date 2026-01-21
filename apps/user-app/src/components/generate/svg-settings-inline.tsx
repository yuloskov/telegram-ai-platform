// Compact inline SVG settings for the generate page

import { useI18n } from "~/i18n";
import type { SvgGenerationSettings } from "~/hooks/useSvgSettings";

const THEME_COLORS = [
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EF4444", label: "Red" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
  { value: "#1F2937", label: "Dark" },
];

const BACKGROUND_STYLES = [
  { value: "solid", labelKey: "svg.backgroundStyles.solid" },
  { value: "gradient", labelKey: "svg.backgroundStyles.gradient" },
  { value: "transparent", labelKey: "svg.backgroundStyles.transparent" },
] as const;

const FONT_STYLES = [
  { value: "modern", labelKey: "svg.fontStyles.modern" },
  { value: "classic", labelKey: "svg.fontStyles.classic" },
  { value: "playful", labelKey: "svg.fontStyles.playful" },
  { value: "technical", labelKey: "svg.fontStyles.technical" },
] as const;

interface SVGSettingsInlineProps {
  settings: SvgGenerationSettings;
  onUpdate: <K extends keyof SvgGenerationSettings>(key: K, value: SvgGenerationSettings[K]) => void;
  disabled?: boolean;
}

export function SVGSettingsInline({ settings, onUpdate, disabled }: SVGSettingsInlineProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-3 p-3 bg-[var(--bg-secondary)] rounded-[var(--radius-md)] border border-[var(--border-primary)]">
      {/* Theme Color */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--text-secondary)] w-20 shrink-0">
          {t("svg.themeColorLabel")}
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {THEME_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              disabled={disabled}
              onClick={() => onUpdate("themeColor", color.value)}
              className={`h-6 w-6 rounded-md border-2 transition-all ${
                settings.themeColor === color.value
                  ? "border-[var(--text-primary)] ring-2 ring-[var(--accent-primary)] ring-offset-1"
                  : "border-transparent hover:scale-110"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            />
          ))}
          <input
            type="color"
            value={settings.themeColor}
            onChange={(e) => onUpdate("themeColor", e.target.value)}
            disabled={disabled}
            className={`h-6 w-6 cursor-pointer rounded-md border border-[var(--border-primary)] bg-transparent p-0 ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Custom color"
          />
        </div>
      </div>

      {/* Background & Font in one row */}
      <div className="flex flex-wrap gap-4">
        {/* Background Style */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">
            {t("svg.backgroundStyleLabel")}
          </span>
          <div className="flex rounded-[var(--radius-md)] border border-[var(--border-primary)] overflow-hidden">
            {BACKGROUND_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                disabled={disabled}
                onClick={() => onUpdate("backgroundStyle", style.value)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  settings.backgroundStyle === style.value
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                } ${style.value !== "solid" ? "border-l border-[var(--border-primary)]" : ""} ${
                  disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {t(style.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Font Style */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">
            {t("svg.fontStyleLabel")}
          </span>
          <div className="flex rounded-[var(--radius-md)] border border-[var(--border-primary)] overflow-hidden">
            {FONT_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                disabled={disabled}
                onClick={() => onUpdate("fontStyle", style.value)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  settings.fontStyle === style.value
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                } ${style.value !== "modern" ? "border-l border-[var(--border-primary)]" : ""} ${
                  disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {t(style.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Style Prompt (optional, collapsed by default) */}
      <details className="group">
        <summary className="text-xs text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)] list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          {t("svg.stylePromptLabel")}
        </summary>
        <textarea
          value={settings.stylePrompt}
          onChange={(e) => onUpdate("stylePrompt", e.target.value)}
          disabled={disabled}
          placeholder={t("svg.stylePromptPlaceholder")}
          rows={2}
          className={`mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        />
      </details>
    </div>
  );
}
