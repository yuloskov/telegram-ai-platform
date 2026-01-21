import * as React from "react";
import { cn } from "~/lib/utils";

const presetColors = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#1F2937", // Dark Gray
  "#6B7280", // Gray
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        {/* Color swatches */}
        <div className="flex flex-wrap gap-1.5">
          {presetColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={cn(
                "h-6 w-6 rounded-md border-2 transition-all",
                value === color
                  ? "border-[var(--text-primary)] scale-110"
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Custom color input */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-md border border-[var(--border-primary)] bg-transparent p-0.5"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const hex = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
                onChange(hex);
              }
            }}
            className="h-8 w-20 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 text-xs font-mono text-[var(--text-primary)]"
            placeholder="#000000"
          />
        </div>
      </div>
    </div>
  );
}
