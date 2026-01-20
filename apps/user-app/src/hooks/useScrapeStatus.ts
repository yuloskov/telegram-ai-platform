import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ScrapeLog {
  id: string;
  status: string;
  postsFound: number;
  newPosts: number;
  createdAt: string;
}

interface ScrapeLogsResponse {
  data: ScrapeLog[];
}

export function useScrapeStatus(channelId: string, sourceId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["scrape-status", channelId, sourceId],
    queryFn: async () => {
      const res = await fetch(
        `/api/channels/${channelId}/sources/${sourceId}/scrape-logs?limit=1`
      );
      const json = await res.json();
      return json as ScrapeLogsResponse;
    },
    enabled: !!channelId && !!sourceId,
    refetchInterval: (query) => {
      // Poll more frequently when a job is running
      const latestLog = query.state.data?.data?.[0];
      if (latestLog?.status === "running" || latestLog?.status === "pending") {
        return 2000; // Poll every 2 seconds when running
      }
      return 30000; // Otherwise every 30 seconds
    },
  });

  const latestLog = data?.data?.[0];
  const isRunning = latestLog?.status === "running" || latestLog?.status === "pending";

  // Invalidate related queries when job completes
  const invalidateOnComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["scrape-logs", channelId, sourceId] });
    queryClient.invalidateQueries({ queryKey: ["source-content", channelId, sourceId] });
    queryClient.invalidateQueries({ queryKey: ["source", channelId, sourceId] });
  };

  return {
    isRunning,
    isLoading,
    latestLog,
    invalidateOnComplete,
  };
}
