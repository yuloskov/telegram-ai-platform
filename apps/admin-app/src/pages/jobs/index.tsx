import Head from "next/head";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, Loader, RefreshCw, Trash2, StopCircle } from "lucide-react";
import { AdminLayout } from "~/components/layout";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui";

type JobStatus = "pending" | "running" | "completed" | "failed" | "retrying";

interface JobLog {
  id: string;
  jobId: string;
  jobType: string;
  status: JobStatus;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface JobsResponse {
  data: JobLog[];
  jobTypes: string[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchJobs(page: number, limit: number, status: string, jobType: string): Promise<JobsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(status && { status }),
    ...(jobType && { jobType }),
  });
  const res = await fetch(`/api/jobs?${params}`);
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error);
  }
  return {
    data: data.data,
    jobTypes: data.jobTypes,
    pagination: data.pagination,
  };
}

function getStatusIcon(status: JobStatus) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-[var(--status-success)]" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-[var(--status-error)]" />;
    case "running":
      return <Loader className="h-4 w-4 text-[var(--accent-primary)] animate-spin" />;
    case "retrying":
      return <RefreshCw className="h-4 w-4 text-[var(--status-warning)]" />;
    default:
      return <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />;
  }
}

function getStatusVariant(status: JobStatus): "success" | "error" | "warning" | "info" | "default" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "running":
      return "info";
    case "retrying":
      return "warning";
    default:
      return "default";
  }
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 4, 5, "...", total];
  }

  if (current >= total - 2) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function JobsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "jobs", page, limit, statusFilter, typeFilter],
    queryFn: () => fetchJobs(page, limit, statusFilter, typeFilter),
    refetchInterval: 10000,
  });

  const stopMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
    },
  });

  return (
    <>
      <Head>
        <title>Jobs - Admin Panel</title>
      </Head>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Jobs</h1>
              <p className="text-[var(--text-secondary)]">Monitor background job queue</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Select
                  value={statusFilter || "all"}
                  onValueChange={(value) => {
                    setStatusFilter(value === "all" ? "" : value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="retrying">Retrying</SelectItem>
                  </SelectContent>
                </Select>

                {data?.jobTypes && data.jobTypes.length > 0 && (
                  <Select
                    value={typeFilter || "all"}
                    onValueChange={(value) => {
                      setTypeFilter(value === "all" ? "" : value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {data.jobTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {isLoading && (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              )}

              {error && (
                <div className="p-4 rounded-[var(--radius-md)] bg-[#f8d7da] text-[#721c24]">
                  Failed to load jobs: {error instanceof Error ? error.message : "Unknown error"}
                </div>
              )}

              {data && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--border-secondary)]">
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            Job ID
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            Type
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            Attempts
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            Created
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            Completed
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.data.map((job) => (
                          <tr key={job.id} className="border-b border-[var(--border-secondary)]">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(job.status)}
                                <Badge variant={getStatusVariant(job.status)}>
                                  {job.status}
                                </Badge>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[var(--text-primary)] font-mono text-sm">
                                {job.jobId.slice(0, 8)}...
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="primary">{job.jobType}</Badge>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-secondary)]">
                              {job.attempts}
                            </td>
                            <td className="py-3 px-4 text-[var(--text-secondary)] text-sm">
                              {new Date(job.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-[var(--text-secondary)] text-sm">
                              {job.completedAt
                                ? new Date(job.completedAt).toLocaleString()
                                : "-"}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-2">
                                {(job.status === "pending" || job.status === "running") && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => stopMutation.mutate(job.id)}
                                    disabled={stopMutation.isPending}
                                    title="Stop job"
                                  >
                                    <StopCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this job?")) {
                                      deleteMutation.mutate(job.id);
                                    }
                                  }}
                                  disabled={deleteMutation.isPending}
                                  title="Delete job"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {data.data.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                      No jobs found
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-secondary)]">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-[var(--text-secondary)]">
                        Showing {data.pagination.total === 0 ? 0 : (page - 1) * limit + 1} to{" "}
                        {Math.min(page * limit, data.pagination.total)} of {data.pagination.total}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--text-secondary)]">Per page:</span>
                        <Select
                          value={String(limit)}
                          onValueChange={(value) => {
                            setLimit(Number(value));
                            setPage(1);
                          }}
                        >
                          <SelectTrigger className="w-[80px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {data.pagination.totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                        >
                          First
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {getPageNumbers(page, data.pagination.totalPages).map((pageNum, idx) =>
                          pageNum === "..." ? (
                            <span key={`ellipsis-${idx}`} className="px-2 text-[var(--text-tertiary)]">
                              ...
                            </span>
                          ) : (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "secondary"}
                              size="sm"
                              onClick={() => setPage(pageNum as number)}
                            >
                              {pageNum}
                            </Button>
                          )
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                          disabled={page === data.pagination.totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPage(data.pagination.totalPages)}
                          disabled={page === data.pagination.totalPages}
                        >
                          Last
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
}
