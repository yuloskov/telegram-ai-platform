import { useQuery } from "@tanstack/react-query";
import { History, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { useI18n } from "~/i18n";

interface ScrapingHistoryProps {
  channelId: string;
  sourceId: string;
}

interface ScrapeLog {
  id: string;
  status: string;
  postsFound: number;
  newPosts: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface ScrapeLogsResponse {
  data: ScrapeLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-[var(--status-success)]" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-[var(--status-error)]" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-[var(--accent-primary)] animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />;
  }
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return "-";
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const durationSec = Math.round((end - start) / 1000);
  if (durationSec < 60) return `${durationSec}s`;
  return `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`;
}

export function ScrapingHistory({ channelId, sourceId }: ScrapingHistoryProps) {
  const { t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ["scrape-logs", channelId, sourceId],
    queryFn: async () => {
      const res = await fetch(
        `/api/channels/${channelId}/sources/${sourceId}/scrape-logs?limit=5`
      );
      const json = await res.json();
      return json as ScrapeLogsResponse;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  const logs = data?.data ?? [];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <History className="h-5 w-5 text-[var(--text-tertiary)]" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          {t("sources.scrapeHistory")}
        </h3>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">
          {t("sources.noScrapeHistory")}
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between py-2 border-b border-[var(--border-secondary)] last:border-0"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(log.status)}
                <div>
                  <p className="text-sm text-[var(--text-primary)]">
                    {log.status === "completed" && (
                      <>
                        {log.newPosts} new / {log.postsFound} total
                      </>
                    )}
                    {log.status === "failed" && (
                      <span className="text-[var(--status-error)]">
                        {log.error || "Failed"}
                      </span>
                    )}
                    {log.status === "running" && "Running..."}
                    {log.status === "pending" && "Pending..."}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">
                {formatDuration(log.startedAt, log.completedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
