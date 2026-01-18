import type { NextApiResponse } from "next";
import { prisma } from "@repo/database";
import { withAdminAuth, type AuthenticatedRequest } from "~/lib/auth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const jobType = req.query.jobType as string;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (jobType) {
      where.jobType = jobType;
    }

    const [jobs, total, jobTypes] = await Promise.all([
      prisma.jobLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.jobLog.count({ where }),
      prisma.jobLog.findMany({
        select: { jobType: true },
        distinct: ["jobType"],
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: jobs,
      jobTypes: jobTypes.map((j) => j.jobType),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Jobs fetch error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch jobs" });
  }
}

export default withAdminAuth(handler);
