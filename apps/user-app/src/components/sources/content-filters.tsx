import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useI18n } from "~/i18n";

export type SortBy = "date" | "views" | "forwards";
export type DateRange = "all" | "week" | "month";

interface ContentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  dateRange: DateRange;
  onDateRangeChange: (value: DateRange) => void;
}

export function ContentFilters({
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  dateRange,
  onDateRangeChange,
}: ContentFiltersProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
        <Input
          type="text"
          placeholder={t("sources.search")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Sort By */}
      <Select value={sortBy} onValueChange={(v) => onSortByChange(v as SortBy)}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder={t("sources.sortBy")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">{t("sources.sortByDate")}</SelectItem>
          <SelectItem value="views">{t("sources.sortByViews")}</SelectItem>
          <SelectItem value="forwards">{t("sources.sortByForwards")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range */}
      <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRange)}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder={t("sources.dateRange")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("sources.dateRangeAll")}</SelectItem>
          <SelectItem value="week">{t("sources.dateRangeWeek")}</SelectItem>
          <SelectItem value="month">{t("sources.dateRangeMonth")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
