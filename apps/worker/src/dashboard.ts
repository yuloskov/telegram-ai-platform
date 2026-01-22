import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue } from "bullmq";
import express from "express";
import type { Redis } from "ioredis";
import { QUEUE_NAMES } from "@repo/shared/queues";

const DASHBOARD_PORT = process.env.BULL_BOARD_PORT ?? 3001;

export function startDashboard(connection: Redis) {
  // Create Queue instances for Bull Board (read-only)
  const queues = Object.values(QUEUE_NAMES).map(
    (name) => new Queue(name, { connection })
  );

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/");

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  const app = express();
  app.use("/", serverAdapter.getRouter());

  const server = app.listen(DASHBOARD_PORT, () => {
    console.log(`Bull Board dashboard running at http://localhost:${DASHBOARD_PORT}`);
  });

  return {
    close: async () => {
      server.close();
      await Promise.all(queues.map((q) => q.close()));
    },
  };
}
