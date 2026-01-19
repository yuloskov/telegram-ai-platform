import Head from "next/head";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Wifi, WifiOff } from "lucide-react";
import { AdminLayout } from "~/components/layout";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "~/components/ui";

interface Session {
  id: string;
  phone: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface SessionsResponse {
  data: Session[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchSessions(page: number, status: string): Promise<SessionsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    ...(status && { status }),
  });
  const res = await fetch(`/api/sessions?${params}`);
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error);
  }
  return { data: data.data, pagination: data.pagination };
}

async function toggleSessionStatus(id: string, isActive: boolean) {
  const res = await fetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error);
  }
  return data.data;
}

async function deleteSession(id: string) {
  const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error);
  }
  return data;
}

async function testSession(id: string) {
  const res = await fetch(`/api/sessions/${id}/test`, { method: "POST" });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error);
  }
  return data.data;
}

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    result: {
      connected: boolean;
      user?: { firstName?: string; lastName?: string; username?: string; phone?: string };
      error?: string;
    };
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "sessions", page, statusFilter],
    queryFn: () => fetchSessions(page, statusFilter),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleSessionStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
      setDeleteModalId(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: testSession,
    onSuccess: (result, id) => {
      setTestResult({ id, result });
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
    },
  });

  return (
    <>
      <Head>
        <title>Sessions - Admin Panel</title>
      </Head>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Telegram Sessions</h1>
              <p className="text-[var(--text-secondary)]">
                Manage MTProto sessions for channel scraping
              </p>
            </div>
            <Link href="/sessions/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Session
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-end mb-6">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] px-4 text-sm text-[var(--text-primary)] border-none"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {isLoading && (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              )}

              {error && (
                <div className="p-4 rounded-[var(--radius-md)] bg-[#f8d7da] text-[#721c24]">
                  Failed to load sessions: {error instanceof Error ? error.message : "Unknown error"}
                </div>
              )}

              {data && (
                <>
                  <SessionTable
                    sessions={data.data}
                    onToggle={(id, isActive) => toggleMutation.mutate({ id, isActive })}
                    onDelete={(id) => setDeleteModalId(id)}
                    onTest={(id) => testMutation.mutate(id)}
                    isToggling={toggleMutation.isPending}
                    isTesting={testMutation.isPending}
                    testingId={testMutation.isPending ? testMutation.variables : null}
                  />

                  {data.data.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                      No sessions found. Add a new session to enable scraping.
                    </div>
                  )}

                  {data.pagination.totalPages > 1 && (
                    <Pagination
                      page={page}
                      totalPages={data.pagination.totalPages}
                      total={data.pagination.total}
                      onPageChange={setPage}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Modal */}
        <Modal open={!!deleteModalId} onOpenChange={(open) => !open && setDeleteModalId(null)}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Delete Session</ModalTitle>
            </ModalHeader>
            <p className="text-[var(--text-secondary)] mb-6">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteModalId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteModalId && deleteMutation.mutate(deleteModalId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </ModalContent>
        </Modal>

        {/* Test Result Modal */}
        <Modal open={!!testResult} onOpenChange={(open) => !open && setTestResult(null)}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Connection Test Result</ModalTitle>
            </ModalHeader>
            {testResult && <TestResultContent result={testResult.result} />}
            <div className="flex justify-end mt-6">
              <Button onClick={() => setTestResult(null)}>Close</Button>
            </div>
          </ModalContent>
        </Modal>
      </AdminLayout>
    </>
  );
}

interface SessionTableProps {
  sessions: Session[];
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  isToggling: boolean;
  isTesting: boolean;
  testingId: string | null;
}

function SessionTable({
  sessions,
  onToggle,
  onDelete,
  onTest,
  isToggling,
  isTesting,
  testingId,
}: SessionTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border-secondary)]">
            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
              Phone
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
              Last Used
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
              Created
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-b border-[var(--border-secondary)]">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {session.isActive ? (
                    <Wifi className="h-4 w-4 text-[var(--success)]" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-[var(--text-tertiary)]" />
                  )}
                  <span className="text-[var(--text-primary)] font-medium">{session.phone}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge variant={session.isActive ? "success" : "error"}>
                  {session.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="py-3 px-4 text-[var(--text-secondary)] text-sm">
                {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : "Never"}
              </td>
              <td className="py-3 px-4 text-[var(--text-secondary)] text-sm">
                {new Date(session.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onTest(session.id)}
                    disabled={isTesting && testingId === session.id}
                  >
                    {isTesting && testingId === session.id ? "Testing..." : "Test"}
                  </Button>
                  <Button
                    variant={session.isActive ? "secondary" : "default"}
                    size="sm"
                    onClick={() => onToggle(session.id, !session.isActive)}
                    disabled={isToggling}
                  >
                    {session.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDelete(session.id)}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-secondary)]">
      <div className="text-sm text-[var(--text-secondary)]">
        Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total}
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface TestResultUser {
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
}

interface TestResultContentProps {
  result: {
    connected: boolean;
    user?: TestResultUser;
    error?: string;
  };
}

function TestResultContent({ result }: TestResultContentProps) {
  if (result.connected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[var(--success)]">
          <Wifi className="h-5 w-5" />
          <span className="font-medium">Connection Successful</span>
        </div>
        {result.user && (
          <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-md)] p-4">
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Account Info</h4>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-[var(--text-secondary)]">Name:</span>{" "}
                {result.user.firstName || ""} {result.user.lastName || ""}
              </p>
              {result.user.username && (
                <p>
                  <span className="text-[var(--text-secondary)]">Username:</span> @
                  {result.user.username}
                </p>
              )}
              <p>
                <span className="text-[var(--text-secondary)]">Phone:</span>{" "}
                {result.user.phone || ""}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[var(--error)]">
        <WifiOff className="h-5 w-5" />
        <span className="font-medium">Connection Failed</span>
      </div>
      {result.error && (
        <div className="bg-[#fef2f2] rounded-[var(--radius-md)] p-4 text-sm text-[#991b1b]">
          {result.error}
        </div>
      )}
    </div>
  );
}
