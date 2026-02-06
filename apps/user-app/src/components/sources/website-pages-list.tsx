import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, AlertCircle } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Badge, type BadgeVariant } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { useI18n } from "~/i18n";

interface WebsitePage {
  id: string;
  url: string;
  path: string | null;
  title: string | null;
  status: string;
  relevanceScore: number | null;
  error: string | null;
  discoveredAt: string;
  lastScrapedAt: string | null;
}

interface WebsitePagesListProps {
  channelId: string;
  sourceId: string;
}

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  discovered: "info",
  relevant: "warning",
  scraping: "purple",
  scraped: "success",
  failed: "error",
  skipped: "default",
};

export function WebsitePagesList({ channelId, sourceId }: WebsitePagesListProps) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["website-pages", channelId, sourceId, page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const res = await fetch(
        `/api/channels/${channelId}/sources/${sourceId}/pages?${params}`
      );
      const json = await res.json();
      return json.data as {
        pages: WebsitePage[];
        total: number;
        page: number;
        pageSize: number;
      };
    },
  });

  const statuses = ["all", "discovered", "relevant", "scraping", "scraped", "failed", "skipped"];
  const statusKey = (s: string) =>
    s === "all" ? t("sources.allStatuses") : t(`sources.pageStatuses.${s}` as Parameters<typeof t>[0]);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner /></div>;
  }

  const pages = data?.pages ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              statusFilter === s
                ? "bg-[var(--accent-primary)] text-white"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            {statusKey(s)}
          </button>
        ))}
      </div>

      {/* Pages list */}
      {pages.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] text-center py-8">
          {t("sources.noChunks")}
        </p>
      ) : (
        <div className="space-y-2">
          {pages.map((wp) => (
            <Card key={wp.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={STATUS_VARIANTS[wp.status] ?? "default"}>
                      {statusKey(wp.status)}
                    </Badge>
                    {wp.relevanceScore !== null && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {t("sources.relevanceScore")}: {(wp.relevanceScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {wp.title || wp.path || wp.url}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">{wp.url}</p>
                  {wp.error && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {wp.error}
                    </div>
                  )}
                </div>
                <a
                  href={wp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t("common.previous")}
          </Button>
          <span className="text-sm text-[var(--text-secondary)]">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {t("common.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
