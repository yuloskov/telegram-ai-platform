import Head from "next/head";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, User as UserIcon, Radio, Calendar } from "lucide-react";
import { AdminLayout } from "~/components/layout";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Spinner } from "~/components/ui";

interface Channel {
  id: string;
  title: string;
  username: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    posts: number;
  };
}

interface UserDetail {
  id: string;
  telegramId: string;
  username: string | null;
  displayName: string | null;
  language: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  channels: Channel[];
  _count: {
    channels: number;
  };
}

async function fetchUser(id: string): Promise<UserDetail> {
  const res = await fetch(`/api/users/${id}`);
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error);
  }
  return data.data;
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

export default function UserDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = router.query;

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => fetchUser(id as string),
    enabled: !!id,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleUserStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  return (
    <>
      <Head>
        <title>{user ? `${user.displayName || user.username || "User"} - Admin Panel` : "User - Admin Panel"}</title>
      </Head>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/users">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">User Details</h1>
              <p className="text-[var(--text-secondary)]">View and manage user information</p>
            </div>
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}

          {error && (
            <div className="p-4 rounded-[var(--radius-md)] bg-[#f8d7da] text-[#721c24]">
              Failed to load user: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {user && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserIcon className="h-5 w-5" />
                      Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <div className="h-24 w-24 rounded-full bg-[var(--accent-tertiary)] flex items-center justify-center">
                          <span className="text-3xl font-bold text-[var(--accent-primary)]">
                            {(user.displayName ?? user.username ?? "U")[0]?.toUpperCase() ?? "U"}
                          </span>
                        </div>
                      </div>

                      <div className="text-center">
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">
                          {user.displayName || user.username || "Unknown"}
                        </h2>
                        {user.username && (
                          <p className="text-[var(--text-secondary)]">@{user.username}</p>
                        )}
                      </div>

                      <div className="space-y-3 pt-4 border-t border-[var(--border-secondary)]">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-secondary)]">Status</span>
                          <Badge variant={user.isActive ? "success" : "error"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-secondary)]">Telegram ID</span>
                          <span className="text-[var(--text-primary)]">{user.telegramId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-secondary)]">Language</span>
                          <span className="text-[var(--text-primary)]">{user.language.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-secondary)]">Joined</span>
                          <span className="text-[var(--text-primary)]">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant={user.isActive ? "danger" : "default"}
                        className="w-full mt-4"
                        onClick={() =>
                          toggleMutation.mutate({
                            id: user.id,
                            isActive: !user.isActive,
                          })
                        }
                        disabled={toggleMutation.isPending}
                      >
                        {user.isActive ? "Deactivate User" : "Activate User"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Radio className="h-5 w-5" />
                      Channels ({user._count.channels})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {user.channels.length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-secondary)]">
                        No channels found
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {user.channels.map((channel) => (
                          <div
                            key={channel.id}
                            className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--bg-secondary)]"
                          >
                            <div>
                              <h3 className="font-medium text-[var(--text-primary)]">
                                {channel.title}
                              </h3>
                              {channel.username && (
                                <p className="text-sm text-[var(--text-secondary)]">
                                  @{channel.username}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-1 text-sm text-[var(--text-tertiary)]">
                                <span>{channel._count.posts} posts</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(channel.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Badge variant={channel.isActive ? "success" : "error"}>
                              {channel.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
