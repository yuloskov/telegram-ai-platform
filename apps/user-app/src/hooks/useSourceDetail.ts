// Hook for source detail page data fetching and mutations

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useChannel } from "./useChannel";
import { useScrapeStatus } from "./useScrapeStatus";
import type { SortBy, DateRange } from "~/components/sources/content-filters";

interface ContentSource {
  id: string;
  sourceType: "telegram" | "document" | "webpage" | "website";
  telegramUsername: string | null;
  documentName: string | null;
  documentUrl: string | null;
  documentSize: number | null;
  chunkingPrompt: string | null;
  webpageUrl: string | null;
  webpageTitle: string | null;
  webpageDomain: string | null;
  webpageError: string | null;
  websiteUrl: string | null;
  websiteTitle: string | null;
  websiteDomain: string | null;
  websiteError: string | null;
  websiteCrawlStatus: string | null;
  websitePagesTotal: number;
  websitePagesScraped: number;
  isActive: boolean;
  lastScrapedAt: string | null;
  createdAt: string;
  _count: { scrapedContent: number };
}

interface ScrapedContent {
  id: string;
  telegramMessageId: string | null;
  chunkIndex: number | null;
  sectionTitle: string | null;
  text: string | null;
  mediaUrls: string[];
  views: number;
  forwards: number;
  reactions: number;
  scrapedAt: string;
  usedForGeneration: boolean;
}

interface ContentResponse {
  data: ScrapedContent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Re-export types for convenience
export type { SortBy, DateRange };

export function useSourceDetail(
  channelId: string | undefined,
  sourceId: string | undefined,
  authLoading: boolean
) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  // Track scrape job status
  const { isRunning: isScraping, latestLog } = useScrapeStatus(
    channelId as string,
    sourceId as string
  );
  const [prevIsRunning, setPrevIsRunning] = useState(false);

  // Refresh data when scrape job completes
  useEffect(() => {
    if (prevIsRunning && !isScraping) {
      queryClient.invalidateQueries({ queryKey: ["scrape-logs", channelId, sourceId] });
      queryClient.invalidateQueries({ queryKey: ["source-content", channelId, sourceId] });
      queryClient.invalidateQueries({ queryKey: ["source", channelId, sourceId] });
    }
    setPrevIsRunning(isScraping);
  }, [isScraping, prevIsRunning, queryClient, channelId, sourceId]);

  const { data: channel, isLoading: channelLoading } = useChannel(channelId, {
    enabled: !authLoading,
  });

  const { data: source, isLoading: sourceLoading } = useQuery({
    queryKey: ["source", channelId, sourceId],
    queryFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}`);
      const json = await res.json();
      return json.data as ContentSource;
    },
    enabled: !!channelId && !!sourceId && !authLoading,
  });

  const { data: contentData, isLoading: contentLoading } = useQuery({
    queryKey: ["source-content", channelId, sourceId, page, search, sortBy, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sortBy,
        ...(search && { search }),
        ...(dateRange !== "all" && { dateRange }),
      });
      const res = await fetch(
        `/api/channels/${channelId}/sources/${sourceId}/content?${params.toString()}`
      );
      const json = await res.json();
      return json as ContentResponse;
    },
    enabled: !!channelId && !!sourceId && !authLoading,
  });

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}/scrape`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrape-status", channelId, sourceId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources", channelId] });
      router.push(`/channels/${channelId}/sources`);
    },
  });

  // Regenerate document chunks (document sources only)
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}/regenerate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source-content", channelId, sourceId] });
      queryClient.invalidateQueries({ queryKey: ["source", channelId, sourceId] });
    },
  });

  // Update source settings (e.g., chunking prompt)
  const updateSourceMutation = useMutation({
    mutationFn: async (data: { chunkingPrompt?: string | null }) => {
      const res = await fetch(`/api/channels/${channelId}/sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source", channelId, sourceId] });
    },
  });

  // Filter handlers that reset to page 1
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSortByChange = (value: SortBy) => {
    setSortBy(value);
    setPage(1);
  };

  const handleDateRangeChange = (value: DateRange) => {
    setDateRange(value);
    setPage(1);
  };

  return {
    // Data
    channel,
    source,
    content: contentData?.data ?? [],
    pagination: contentData?.pagination,

    // Loading states
    isLoading: authLoading || channelLoading || sourceLoading,
    contentLoading,
    isScraping,

    // Filter state
    page,
    setPage,
    search,
    sortBy,
    dateRange,
    handleSearchChange,
    handleSortByChange,
    handleDateRangeChange,

    // Mutations
    scrapeMutation,
    deleteMutation,
    regenerateMutation,
    updateSourceMutation,
  };
}
