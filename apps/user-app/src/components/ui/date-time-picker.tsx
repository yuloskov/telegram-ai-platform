import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

export interface DateTimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  placeholder?: string;
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  minDate,
  placeholder = "Pick a date and time",
  disabled = false,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Extract time from current value or default to current time
  const hours = value ? value.getHours().toString().padStart(2, "0") : "12";
  const minutes = value ? value.getMinutes().toString().padStart(2, "0") : "00";

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(null);
      return;
    }

    // Preserve the time when changing the date
    const newDate = new Date(date);
    if (value) {
      newDate.setHours(value.getHours(), value.getMinutes());
    } else {
      newDate.setHours(12, 0);
    }
    onChange(newDate);
  };

  const handleTimeChange = (type: "hours" | "minutes", val: string) => {
    const numVal = parseInt(val, 10);
    if (isNaN(numVal)) return;

    const currentDate = value || new Date();
    const newDate = new Date(currentDate);

    if (type === "hours" && numVal >= 0 && numVal <= 23) {
      newDate.setHours(numVal);
    } else if (type === "minutes" && numVal >= 0 && numVal <= 59) {
      newDate.setMinutes(numVal);
    }

    onChange(newDate);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-[var(--text-tertiary)]"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP 'at' HH:mm") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value || undefined}
          onSelect={handleDateSelect}
          disabled={(date) => {
            if (!minDate) return false;
            // Compare only dates, not times - allow selecting today
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
            return dateOnly < minDateOnly;
          }}
          initialFocus
        />
        <div className="border-t border-[var(--border-secondary)] p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">Time:</span>
            <input
              type="number"
              min="0"
              max="23"
              value={hours}
              onChange={(e) => handleTimeChange("hours", e.target.value)}
              className="w-14 h-8 px-2 text-center text-sm rounded-[var(--radius-md)] border border-[var(--border-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
            <span className="text-[var(--text-secondary)]">:</span>
            <input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) => handleTimeChange("minutes", e.target.value)}
              className="w-14 h-8 px-2 text-center text-sm rounded-[var(--radius-md)] border border-[var(--border-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
