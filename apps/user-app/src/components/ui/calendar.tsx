import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "~/lib/utils";
import { buttonVariants } from "~/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-[var(--text-primary)]",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-[var(--text-tertiary)] rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button: cn(
          "inline-flex items-center justify-center h-9 w-9 p-0 font-normal text-[var(--text-primary)] rounded-md transition-colors cursor-pointer",
          "hover:bg-[var(--bg-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
        ),
        range_end: "day-range-end",
        selected:
          "[&>button]:!bg-[var(--accent-primary)] [&>button]:!text-white [&>button]:hover:!bg-[var(--accent-primary)] [&>button]:hover:!text-white rounded-md",
        today: "rounded-md [&>button]:bg-[var(--bg-tertiary)]",
        outside:
          "text-[var(--text-tertiary)] aria-selected:bg-[var(--accent-primary-subtle)]/50 aria-selected:text-[var(--text-tertiary)]",
        disabled: "text-[var(--text-tertiary)] opacity-50",
        range_middle:
          "aria-selected:bg-[var(--accent-primary-subtle)] aria-selected:text-[var(--text-primary)]",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
