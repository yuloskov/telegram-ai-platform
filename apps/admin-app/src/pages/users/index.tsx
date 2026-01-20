import Head from "next/head";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminLayout } from "~/components/layout";
import {
  Card,
  CardContent,
  Input,
  Button,
  Badge,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui";

interface User {
  id: string;
  telegramId: string;
  username: string | null;
  displayName: string | null;
  language: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    channels: number;
  };
}

interface UsersResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchUsers(page: number, search: string, status: string): Promise<UsersResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    ...(search && { search }),
    ...(status && { status }),
  });
  const res = await fetch(`/api/users?${params}`);
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error);
  }
  return { data: data.data, pagination: data.pagination };
}

async function toggleUserStatus(id: string, isActive: boolean) {
  const res = await fetch(`/api/users/${id}`, {
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

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", page, search, statusFilter],
    queryFn: () => fetchUsers(page, search, statusFilter),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleUserStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <>
      <Head>
        <title>Users - Admin Panel</title>
      </Head>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Users</h1>
            <p className="text-[var(--text-secondary)]">Manage platform users</p>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                    <Input
                      placeholder="Search by username or name..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit">Search</Button>
                </form>

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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading && (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              )}

              {error && (
                <div className="p-4 rounded-[var(--radius-md)] bg-[#f8d7da] text-[#721c24]">
                  Failed to load users: {error instanceof Error ? error.message : "Unknown error"}
                </div>
              )}

              {data && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--border-secondary)]">
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            User
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            Telegram ID
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            Channels
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            Joined
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.data.map((user) => (
                          <tr key={user.id} className="border-b border-[var(--border-secondary)]">
                            <td className="py-3 px-4">
                              <Link href={`/users/${user.id}`} className="hover:underline">
                                <div className="text-[var(--text-primary)] font-medium">
                                  {user.displayName || user.username || "Unknown"}
                                </div>
                                {user.username && (
                                  <div className="text-sm text-[var(--text-secondary)]">
                                    @{user.username}
                                  </div>
                                )}
                              </Link>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-secondary)] text-sm">
                              {user.telegramId}
                            </td>
                            <td className="py-3 px-4 text-[var(--text-secondary)]">
                              {user._count.channels}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={user.isActive ? "success" : "error"}>
                                {user.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-secondary)] text-sm">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant={user.isActive ? "danger" : "default"}
                                size="sm"
                                onClick={() =>
                                  toggleMutation.mutate({
                                    id: user.id,
                                    isActive: !user.isActive,
                                  })
                                }
                                disabled={toggleMutation.isPending}
                              >
                                {user.isActive ? "Deactivate" : "Activate"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {data.data.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                      No users found
                    </div>
                  )}

                  {data.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-secondary)]">
                      <div className="text-sm text-[var(--text-secondary)]">
                        Showing {(page - 1) * 20 + 1} to{" "}
                        {Math.min(page * 20, data.pagination.total)} of {data.pagination.total}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                          disabled={page === data.pagination.totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
}
