import Head from "next/head";
import { useQuery } from "@tanstack/react-query";
import { Users, MessageSquare, Briefcase, Radio } from "lucide-react";
import { AdminLayout } from "~/components/layout";
import { Card, CardHeader, CardTitle, CardContent, Spinner, Badge } from "~/components/ui";

interface Stats {
  users: { total: number; active: number; inactive: number };
  channels: { total: number; active: number };
  posts: { total: number; published: number; draft: number; failed: number };
  jobs: { total: number; completed: number; failed: number; pending: number; running: number };
}

async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/stats");
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error);
  }
  return data.data;
}

interface StatCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  subtitle?: string;
  children?: React.ReactNode;
}

function StatCard({ title, icon: Icon, value, subtitle, children }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">
            {title}
          </CardTitle>
          <Icon className="h-5 w-5 text-[var(--text-tertiary)]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-[var(--text-primary)]">{value}</div>
        {subtitle && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <>
      <Head>
        <title>Dashboard - Admin Panel</title>
      </Head>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
            <p className="text-[var(--text-secondary)]">Platform overview and statistics</p>
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}

          {error && (
            <div className="p-4 rounded-[var(--radius-md)] bg-[#f8d7da] text-[#721c24]">
              Failed to load stats: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Users"
                  icon={Users}
                  value={stats.users.total}
                  subtitle={`${stats.users.active} active`}
                />
                <StatCard
                  title="Channels"
                  icon={Radio}
                  value={stats.channels.total}
                  subtitle={`${stats.channels.active} active`}
                />
                <StatCard
                  title="Posts"
                  icon={MessageSquare}
                  value={stats.posts.total}
                  subtitle={`${stats.posts.published} published`}
                />
                <StatCard
                  title="Jobs"
                  icon={Briefcase}
                  value={stats.jobs.total}
                  subtitle={`${stats.jobs.completed} completed`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Post Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Published</span>
                        <Badge variant="success">{stats.posts.published}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Draft</span>
                        <Badge variant="default">{stats.posts.draft}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Failed</span>
                        <Badge variant="error">{stats.posts.failed}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Job Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Completed</span>
                        <Badge variant="success">{stats.jobs.completed}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Running</span>
                        <Badge variant="info">{stats.jobs.running}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Pending</span>
                        <Badge variant="warning">{stats.jobs.pending}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Failed</span>
                        <Badge variant="error">{stats.jobs.failed}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
