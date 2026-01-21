// Image type toggle component for switching between raster and SVG generation

import { Image, Shapes } from "lucide-react";
import { cn } from "~/lib/utils";
import { useI18n } from "~/i18n";

export type ImageType = "raster" | "svg";

interface ImageTypeToggleProps {
  value: ImageType;
  onChange: (type: ImageType) => void;
  disabled?: boolean;
}

export function ImageTypeToggle({
  value,
  onChange,
  disabled = false,
}: ImageTypeToggleProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--text-secondary)]">
        {t("imageType.label")}
      </span>
      <div className="flex rounded-[var(--radius-md)] border border-[var(--border-primary)] overflow-hidden">
        <button
          type="button"
          onClick={() => onChange("raster")}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
            value === "raster"
              ? "bg-[var(--accent-primary)] text-white"
              : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Image className="h-3.5 w-3.5" />
          {t("imageType.raster")}
        </button>
        <button
          type="button"
          onClick={() => onChange("svg")}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-[var(--border-primary)]",
            value === "svg"
              ? "bg-[var(--accent-primary)] text-white"
              : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Shapes className="h-3.5 w-3.5" />
          {t("imageType.svg")}
        </button>
      </div>
    </div>
  );
}
