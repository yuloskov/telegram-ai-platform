import type { NextApiResponse } from "next";
import { prisma } from "@repo/database";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";

interface Stats {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  channels: {
    total: number;
    active: number;
  };
  posts: {
    total: number;
    published: number;
    draft: number;
    failed: number;
  };
  jobs: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    running: number;
  };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // Fetch all stats in parallel
    const [
      totalUsers,
      activeUsers,
      totalChannels,
      activeChannels,
      totalPosts,
      publishedPosts,
      draftPosts,
      failedPosts,
      totalJobs,
      completedJobs,
      failedJobs,
      pendingJobs,
      runningJobs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.channel.count(),
      prisma.channel.count({ where: { isActive: true } }),
      prisma.post.count(),
      prisma.post.count({ where: { status: "published" } }),
      prisma.post.count({ where: { status: "draft" } }),
      prisma.post.count({ where: { status: "failed" } }),
      prisma.jobLog.count(),
      prisma.jobLog.count({ where: { status: "completed" } }),
      prisma.jobLog.count({ where: { status: "failed" } }),
      prisma.jobLog.count({ where: { status: "pending" } }),
      prisma.jobLog.count({ where: { status: "running" } }),
    ]);

    const stats: Stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      channels: {
        total: totalChannels,
        active: activeChannels,
      },
      posts: {
        total: totalPosts,
        published: publishedPosts,
        draft: draftPosts,
        failed: failedPosts,
      },
      jobs: {
        total: totalJobs,
        completed: completedJobs,
        failed: failedJobs,
        pending: pendingJobs,
        running: runningJobs,
      },
    };

    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Stats fetch error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
}

export default withAdminAuth(handler);
