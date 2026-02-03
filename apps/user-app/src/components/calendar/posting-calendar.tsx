import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";

interface CalendarPost {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  skippedAt: string | null;
  contentPlanId: string | null;
  contentPlanName: string | null;
}

interface CalendarData {
  dates: Record<string, CalendarPost[]>;
  totalPosts: number;
  skippedCount: number;
}

interface PostingCalendarProps {
  data: CalendarData | undefined;
  isLoading: boolean;
  onMonthChange: (year: number, month: number) => void;
  onDayClick: (date: string, posts: CalendarPost[]) => void;
  selectedDate: string | null;
}

export function PostingCalendar({
  data,
  isLoading,
  onMonthChange,
  onDayClick,
  selectedDate,
}: PostingCalendarProps) {
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { year, month, daysInMonth, firstDayOfWeek, weeks } = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    // Create weeks array
    const w: (number | null)[][] = [];
    let week: (number | null)[] = [];
    // Fill leading empty days
    for (let i = 0; i < firstDay; i++) {
      week.push(null);
    }
    // Fill days
    for (let day = 1; day <= days; day++) {
      week.push(day);
      if (week.length === 7) {
        w.push(week);
        week = [];
      }
    }
    // Fill trailing empty days
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      w.push(week);
    }
    return { year: y, month: m, daysInMonth: days, firstDayOfWeek: firstDay, weeks: w };
  }, [currentDate]);

  const goToPrevMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    setCurrentDate(newDate);
    onMonthChange(newDate.getFullYear(), newDate.getMonth());
  };

  const goToNextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    setCurrentDate(newDate);
    onMonthChange(newDate.getFullYear(), newDate.getMonth());
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    onMonthChange(today.getFullYear(), today.getMonth());
  };

  const formatDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getPostsForDay = (day: number): CalendarPost[] => {
    if (!data) return [];
    const dateKey = formatDateKey(day);
    return data.dates[dateKey] || [];
  };

  const getStatusColors = (posts: CalendarPost[]) => {
    const colors: string[] = [];
    const hasScheduled = posts.some((p) => p.status === "scheduled");
    const hasPublished = posts.some((p) => p.status === "published");
    const hasSkipped = posts.some((p) => p.skippedAt);
    const hasDraft = posts.some((p) => p.status === "draft");
    const hasFailed = posts.some((p) => p.status === "failed");

    if (hasPublished) colors.push("bg-green-500");
    if (hasScheduled) colors.push("bg-blue-500");
    if (hasSkipped) colors.push("bg-orange-500");
    if (hasDraft) colors.push("bg-gray-400");
    if (hasFailed) colors.push("bg-red-500");

    return colors;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-[var(--bg-primary)] rounded-[var(--radius-lg)] border border-[var(--border-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-secondary)]">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] min-w-[180px] text-center">
            {monthNames[month]} {year}
          </h2>
          <Button variant="ghost" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={goToToday}>
          {t("calendar.today")}
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-[var(--text-tertiary)] py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) => {
              if (day === null) {
                return <div key={`empty-${weekIndex}-${dayIndex}`} className="h-24" />;
              }

              const dateKey = formatDateKey(day);
              const posts = getPostsForDay(day);
              const statusColors = getStatusColors(posts);
              const isSelected = selectedDate === dateKey;
              const isTodayDay = isToday(day);

              return (
                <button
                  key={day}
                  onClick={() => onDayClick(dateKey, posts)}
                  className={cn(
                    "h-24 p-2 rounded-lg border transition-colors text-left flex flex-col",
                    "hover:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]",
                    isSelected
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]"
                      : "border-transparent hover:bg-[var(--bg-secondary)]",
                    isTodayDay && "ring-1 ring-[var(--accent-primary)]"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isTodayDay
                        ? "text-[var(--accent-primary)]"
                        : "text-[var(--text-primary)]"
                    )}
                  >
                    {day}
                  </span>
                  {posts.length > 0 && (
                    <div className="flex-1 flex flex-col justify-end">
                      <div className="flex gap-1 flex-wrap">
                        {statusColors.slice(0, 4).map((color, i) => (
                          <span
                            key={i}
                            className={cn("w-2 h-2 rounded-full", color)}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[var(--text-tertiary)] mt-1">
                        {posts.length} {posts.length === 1 ? "post" : "posts"}
                      </span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 pb-4 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          {t("calendar.scheduled")}
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {t("calendar.published")}
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          {t("calendar.skipped")}
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          {t("calendar.draft")}
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-[var(--bg-primary)]/50 flex items-center justify-center">
          <div className="text-[var(--text-secondary)]">{t("common.loading")}</div>
        </div>
      )}
    </div>
  );
}
