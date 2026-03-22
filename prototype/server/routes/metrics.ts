import type { FastifyInstance } from "fastify";
import { cpus } from "node:os";

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

  // Session usage: tokens and cost (placeholder until usage tracking table exists)
  server.get("/api/usage/session", async () => {
    return {
      totalTokens: 0,
      estimatedCost: 0,
    };
  });
}
