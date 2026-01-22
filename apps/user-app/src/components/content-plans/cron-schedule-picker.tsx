// User-friendly schedule picker that generates cron expressions

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useI18n } from "~/i18n";

interface CronSchedulePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

type FrequencyType = "preset" | "customIntervalMinutes" | "customIntervalHours" | "customTimes";
type PresetValue =
  | "every5min"
  | "every10min"
  | "every15min"
  | "every30min"
  | "every1hour"
  | "every2hours"
  | "every3hours"
  | "every4hours"
  | "every6hours"
  | "every12hours"
  | "daily"
  | "weekdays"
  | "weekends"
  | "weekly";

const DAYS_OF_WEEK = [
  { value: "1", labelKey: "monday" },
  { value: "2", labelKey: "tuesday" },
  { value: "3", labelKey: "wednesday" },
  { value: "4", labelKey: "thursday" },
  { value: "5", labelKey: "friday" },
  { value: "6", labelKey: "saturday" },
  { value: "0", labelKey: "sunday" },
] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface ParsedSchedule {
  type: FrequencyType;
  preset: PresetValue;
  customIntervalMinutes: number;
  customIntervalHours: number;
  customTimes: number[]; // hours
  minute: number;
  dayOfWeek: string;
  singleHour: number;
}

function parseSchedule(cron: string): ParsedSchedule {
  const defaults: ParsedSchedule = {
    type: "preset",
    preset: "daily",
    customIntervalMinutes: 5,
    customIntervalHours: 2,
    customTimes: [9, 18],
    minute: 0,
    dayOfWeek: "1",
    singleHour: 9,
  };

  const parts = cron.split(" ");
  if (parts.length !== 5) return defaults;

  const minuteStr = parts[0] ?? "0";
  const hourStr = parts[1] ?? "9";
  const dayOfWeekStr = parts[4] ?? "*";
  const minuteNum = parseInt(minuteStr, 10) || 0;

  // Check for minute interval patterns (*/X in minute field)
  if (minuteStr.startsWith("*/") && hourStr === "*") {
    const interval = parseInt(minuteStr.slice(2), 10);
    const presetMap: Record<number, PresetValue> = {
      5: "every5min",
      10: "every10min",
      15: "every15min",
      30: "every30min",
    };
    if (presetMap[interval]) {
      return { ...defaults, type: "preset", preset: presetMap[interval] };
    }
    // Custom minute interval
    return { ...defaults, type: "customIntervalMinutes", customIntervalMinutes: interval };
  }

  // Check for hour interval patterns (*/X in hour field)
  if (hourStr.startsWith("*/")) {
    const interval = parseInt(hourStr.slice(2), 10);
    const presetMap: Record<number, PresetValue> = {
      1: "every1hour",
      2: "every2hours",
      3: "every3hours",
      4: "every4hours",
      6: "every6hours",
      12: "every12hours",
    };
    if (presetMap[interval]) {
      return { ...defaults, type: "preset", preset: presetMap[interval], minute: minuteNum };
    }
    // Custom hour interval
    return { ...defaults, type: "customIntervalHours", customIntervalHours: interval, minute: minuteNum };
  }

  // Check for multiple hours (comma-separated)
  if (hourStr.includes(",")) {
    const hours = hourStr.split(",").map((h) => parseInt(h, 10)).sort((a, b) => a - b);
    return { ...defaults, type: "customTimes", customTimes: hours, minute: minuteNum };
  }

  const hourNum = parseInt(hourStr, 10) || 9;

  if (dayOfWeekStr === "*") {
    return { ...defaults, type: "preset", preset: "daily", singleHour: hourNum, minute: minuteNum };
  }
  if (dayOfWeekStr === "1-5") {
    return { ...defaults, type: "preset", preset: "weekdays", singleHour: hourNum, minute: minuteNum };
  }
  if (dayOfWeekStr === "0,6") {
    return { ...defaults, type: "preset", preset: "weekends", singleHour: hourNum, minute: minuteNum };
  }

  return { ...defaults, type: "preset", preset: "weekly", dayOfWeek: dayOfWeekStr, singleHour: hourNum, minute: minuteNum };
}

function buildCron(schedule: ParsedSchedule): string {
  const { type, preset, customIntervalMinutes, customIntervalHours, customTimes, minute, dayOfWeek, singleHour } = schedule;

  if (type === "customIntervalMinutes") {
    return `*/${customIntervalMinutes} * * * *`;
  }

  if (type === "customIntervalHours") {
    return `${minute} */${customIntervalHours} * * *`;
  }

  if (type === "customTimes") {
    const sortedTimes = [...customTimes].sort((a, b) => a - b);
    return `${minute} ${sortedTimes.join(",")} * * *`;
  }

  // Preset
  switch (preset) {
    case "every5min":
      return `*/5 * * * *`;
    case "every10min":
      return `*/10 * * * *`;
    case "every15min":
      return `*/15 * * * *`;
    case "every30min":
      return `*/30 * * * *`;
    case "every1hour":
      return `${minute} */1 * * *`;
    case "every2hours":
      return `${minute} */2 * * *`;
    case "every3hours":
      return `${minute} */3 * * *`;
    case "every4hours":
      return `${minute} */4 * * *`;
    case "every6hours":
      return `${minute} */6 * * *`;
    case "every12hours":
      return `${minute} */12 * * *`;
    case "daily":
      return `${minute} ${singleHour} * * *`;
    case "weekdays":
      return `${minute} ${singleHour} * * 1-5`;
    case "weekends":
      return `${minute} ${singleHour} * * 0,6`;
    case "weekly":
      return `${minute} ${singleHour} * * ${dayOfWeek}`;
    default:
      return `${minute} ${singleHour} * * *`;
  }
}

export function CronSchedulePicker({
  value,
  onChange,
  disabled = false,
}: CronSchedulePickerProps) {
  const { t } = useI18n();
  const parsed = parseSchedule(value);

  const [type, setType] = useState<FrequencyType>(parsed.type);
  const [preset, setPreset] = useState<PresetValue>(parsed.preset);
  const [customIntervalMinutes, setCustomIntervalMinutes] = useState(parsed.customIntervalMinutes);
  const [customIntervalHours, setCustomIntervalHours] = useState(parsed.customIntervalHours);
  const [customTimes, setCustomTimes] = useState<number[]>(parsed.customTimes);
  const [minute, setMinute] = useState(parsed.minute);
  const [dayOfWeek, setDayOfWeek] = useState(parsed.dayOfWeek);
  const [singleHour, setSingleHour] = useState(parsed.singleHour);

  useEffect(() => {
    const newCron = buildCron({ type, preset, customIntervalMinutes, customIntervalHours, customTimes, minute, dayOfWeek, singleHour });
    if (newCron !== value) {
      onChange(newCron);
    }
  }, [type, preset, customIntervalMinutes, customIntervalHours, customTimes, minute, dayOfWeek, singleHour]);

  const handleTypeChange = (newType: string) => {
    if (newType === "customIntervalMinutes" || newType === "customIntervalHours" || newType === "customTimes") {
      setType(newType as FrequencyType);
    } else {
      setType("preset");
      setPreset(newType as PresetValue);
    }
  };

  const addCustomTime = () => {
    // Find next available hour
    const available = HOURS.filter((h) => !customTimes.includes(h));
    if (available.length > 0) {
      setCustomTimes([...customTimes, available[0]!].sort((a, b) => a - b));
    }
  };

  const removeCustomTime = (hour: number) => {
    if (customTimes.length > 1) {
      setCustomTimes(customTimes.filter((h) => h !== hour));
    }
  };

  const updateCustomTime = (oldHour: number, newHour: number) => {
    setCustomTimes(customTimes.map((h) => (h === oldHour ? newHour : h)).sort((a, b) => a - b));
  };

  const showSingleTime = type === "preset" && ["daily", "weekdays", "weekends", "weekly"].includes(preset);
  const showHourIntervalMinute = type === "preset" && ["every1hour", "every2hours", "every3hours", "every4hours", "every6hours", "every12hours"].includes(preset);

  // Combined select value
  const selectValue = type === "preset" ? preset : type;

  return (
    <div className="space-y-3">
      {/* Main selector */}
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--text-secondary)]">
          {t("contentPlans.schedule.frequency")}
        </label>
        <Select value={selectValue} onValueChange={handleTypeChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* Minute-based frequency */}
            <SelectItem value="every5min">{t("contentPlans.schedule.every5min")}</SelectItem>
            <SelectItem value="every10min">{t("contentPlans.schedule.every10min")}</SelectItem>
            <SelectItem value="every15min">{t("contentPlans.schedule.every15min")}</SelectItem>
            <SelectItem value="every30min">{t("contentPlans.schedule.every30min")}</SelectItem>
            {/* Hour-based frequency */}
            <SelectItem value="every1hour">{t("contentPlans.schedule.every1hour")}</SelectItem>
            <SelectItem value="every2hours">{t("contentPlans.schedule.every2hours")}</SelectItem>
            <SelectItem value="every3hours">{t("contentPlans.schedule.every3hours")}</SelectItem>
            <SelectItem value="every4hours">{t("contentPlans.schedule.every4hours")}</SelectItem>
            <SelectItem value="every6hours">{t("contentPlans.schedule.every6hours")}</SelectItem>
            <SelectItem value="every12hours">{t("contentPlans.schedule.every12hours")}</SelectItem>
            {/* Daily options */}
            <SelectItem value="daily">{t("contentPlans.schedule.daily")}</SelectItem>
            <SelectItem value="weekdays">{t("contentPlans.schedule.weekdays")}</SelectItem>
            <SelectItem value="weekends">{t("contentPlans.schedule.weekends")}</SelectItem>
            <SelectItem value="weekly">{t("contentPlans.schedule.weekly")}</SelectItem>
            {/* Custom options */}
            <SelectItem value="customIntervalMinutes">{t("contentPlans.schedule.customIntervalMinutes")}</SelectItem>
            <SelectItem value="customIntervalHours">{t("contentPlans.schedule.customIntervalHours")}</SelectItem>
            <SelectItem value="customTimes">{t("contentPlans.schedule.customTimes")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom minute interval input */}
      {type === "customIntervalMinutes" && (
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-secondary)]">
            {t("contentPlans.schedule.everyXMinutes")}
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={59}
              value={customIntervalMinutes}
              onChange={(e) => setCustomIntervalMinutes(Math.max(1, Math.min(59, parseInt(e.target.value) || 1)))}
              className="w-20"
              disabled={disabled}
            />
            <span className="text-sm text-[var(--text-secondary)]">
              {t("contentPlans.schedule.minutes")}
            </span>
          </div>
        </div>
      )}

      {/* Custom hour interval input */}
      {type === "customIntervalHours" && (
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-secondary)]">
            {t("contentPlans.schedule.everyXHours")}
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={23}
              value={customIntervalHours}
              onChange={(e) => setCustomIntervalHours(Math.max(1, Math.min(23, parseInt(e.target.value) || 1)))}
              className="w-20"
              disabled={disabled}
            />
            <span className="text-sm text-[var(--text-secondary)]">
              {t("contentPlans.schedule.hours")}
            </span>
          </div>
        </div>
      )}

      {/* Custom times list */}
      {type === "customTimes" && (
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-secondary)]">
            {t("contentPlans.schedule.postingTimes")}
          </label>
          <div className="space-y-2">
            {customTimes.map((hour, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={hour.toString()}
                  onValueChange={(v) => updateCustomTime(hour, parseInt(v, 10))}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem
                        key={h}
                        value={h.toString()}
                        disabled={customTimes.includes(h) && h !== hour}
                      >
                        {h.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customTimes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomTime(hour)}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {customTimes.length < 24 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addCustomTime}
                disabled={disabled}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("contentPlans.schedule.addTime")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Day of week (only for weekly) */}
      {type === "preset" && preset === "weekly" && (
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-secondary)]">
            {t("contentPlans.schedule.dayOfWeek")}
          </label>
          <Select value={dayOfWeek} onValueChange={setDayOfWeek} disabled={disabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day.value} value={day.value}>
                  {t(`contentPlans.schedule.days.${day.labelKey}` as const)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Minute selector for hour interval frequencies */}
      {(showHourIntervalMinute || type === "customIntervalHours") && (
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-secondary)]">
            {t("contentPlans.schedule.startMinute")}
          </label>
          <Select value={minute.toString()} onValueChange={(v) => setMinute(parseInt(v, 10))} disabled={disabled}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  :{m.toString().padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Minute for custom times */}
      {type === "customTimes" && (
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-secondary)]">
            {t("contentPlans.schedule.minuteOfHour")}
          </label>
          <Select value={minute.toString()} onValueChange={(v) => setMinute(parseInt(v, 10))} disabled={disabled}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  :{m.toString().padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Single time picker */}
      {showSingleTime && (
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--text-secondary)]">
            {t("contentPlans.schedule.time")}
          </label>
          <div className="flex gap-2">
            <Select value={singleHour.toString()} onValueChange={(v) => setSingleHour(parseInt(v, 10))} disabled={disabled}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={h.toString()}>
                    {h.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="flex items-center text-[var(--text-secondary)]">:</span>
            <Select value={minute.toString()} onValueChange={(v) => setMinute(parseInt(v, 10))} disabled={disabled}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 15, 30, 45].map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {m.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

type DayKey = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

/**
 * Convert a cron expression to a human-readable string.
 */
export function cronToHumanReadable(cron: string, t: ReturnType<typeof useI18n>["t"]): string {
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;

  const minuteStr = parts[0] ?? "0";
  const hourStr = parts[1] ?? "0";
  const dayOfWeek = parts[4] ?? "*";

  // Minute interval patterns
  if (minuteStr.startsWith("*/") && hourStr === "*") {
    const interval = parseInt(minuteStr.slice(2), 10);
    return t("contentPlans.schedule.everyXMinutesLabel", { count: interval });
  }

  // Hour interval patterns
  if (hourStr.startsWith("*/")) {
    const interval = parseInt(hourStr.slice(2), 10);
    return t("contentPlans.schedule.everyXHoursLabel", { count: interval });
  }

  // Multiple hours
  if (hourStr.includes(",")) {
    const hours = hourStr.split(",");
    const times = hours.map((h) => `${h.padStart(2, "0")}:${minuteStr.padStart(2, "0")}`).join(", ");
    return `${t("contentPlans.schedule.at")} ${times}`;
  }

  const timeStr = `${hourStr.padStart(2, "0")}:${minuteStr.padStart(2, "0")}`;

  if (dayOfWeek === "*") {
    return `${t("contentPlans.schedule.daily")} ${t("contentPlans.schedule.at")} ${timeStr}`;
  }
  if (dayOfWeek === "1-5") {
    return `${t("contentPlans.schedule.weekdays")} ${t("contentPlans.schedule.at")} ${timeStr}`;
  }
  if (dayOfWeek === "0,6") {
    return `${t("contentPlans.schedule.weekends")} ${t("contentPlans.schedule.at")} ${timeStr}`;
  }

  const dayMap: Record<string, DayKey> = {
    "0": "sunday", "1": "monday", "2": "tuesday", "3": "wednesday",
    "4": "thursday", "5": "friday", "6": "saturday",
  };
  const dayKey: DayKey = dayMap[dayOfWeek] ?? "monday";
  const dayName = t(`contentPlans.schedule.days.${dayKey}`);

  return `${dayName} ${t("contentPlans.schedule.at")} ${timeStr}`;
}
