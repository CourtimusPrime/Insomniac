import type { FastifyInstance } from "fastify";
import { cpus } from "node:os";
import { sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { usageRecords } from "../db/schema/index.js";

let prevCpuUsage = process.cpuUsage();
let prevTime = Date.now();

function getCpuPercent(): number {
  const currentUsage = process.cpuUsage(prevCpuUsage);
  const currentTime = Date.now();
  const elapsedMs = currentTime - prevTime;

  if (elapsedMs === 0) return 0;

  // cpuUsage returns microseconds; convert elapsed to microseconds
  const totalCpuUs = currentUsage.user + currentUsage.system;
  const elapsedUs = elapsedMs * 1000;
  const numCores = cpus().length || 1;

  // Percentage of a single core (capped at 100)
  const percent = Math.min(100, Math.round((totalCpuUs / elapsedUs / numCores) * 100));

  prevCpuUsage = process.cpuUsage();
  prevTime = currentTime;

  return percent;
}

export async function metricsRoutes(server: FastifyInstance): Promise<void> {
  // System metrics: CPU, RAM, uptime
  server.get("/api/system/metrics", async () => {
    const mem = process.memoryUsage();
    return {
      cpu: getCpuPercent(),
      ram: Math.round(mem.rss / 1024 / 1024), // MB
      uptime: Math.floor(process.uptime()),
    };
  });

  // Session usage: tokens and cost from usage_records table
  server.get("/api/usage/session", async () => {
    const result = db
      .select({
        totalTokens: sql<number>`coalesce(sum(${usageRecords.inputTokens} + ${usageRecords.outputTokens}), 0)`,
        estimatedCost: sql<number>`coalesce(sum(${usageRecords.estimatedCost}), 0)`,
      })
      .from(usageRecords)
      .get();

    return {
      totalTokens: result?.totalTokens ?? 0,
      estimatedCost: result?.estimatedCost ?? 0,
    };
  });
}
