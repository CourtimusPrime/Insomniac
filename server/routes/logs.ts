import type { FastifyInstance } from "fastify";
import { sql, desc, like, and, eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { logEntries } from "../db/schema/index.js";
import { broadcast } from "../ws/handler.js";

export async function logRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/logs — recent log entries with optional search/filter
  server.get<{ Querystring: { limit?: string; search?: string; source?: string } }>(
    "/api/logs",
    async (request) => {
      const limit = Math.min(Number(request.query.limit) || 100, 500);
      const search = request.query.search?.trim();
      const source = request.query.source?.trim();

      const conditions = [];
      if (search) conditions.push(like(logEntries.message, `%${search}%`));
      if (source) conditions.push(eq(logEntries.source, source));

      const rows = db
        .select()
        .from(logEntries)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(logEntries.createdAt))
        .limit(limit)
        .all();

      // Return in chronological order (oldest first)
      return rows.reverse();
    },
  );

  // POST /api/logs — insert a log entry (and broadcast via WebSocket)
  server.post<{
    Body: { source: string; level?: string; message: string };
  }>("/api/logs", async (request, reply) => {
    const { source, level = "info", message } = request.body;

    const [entry] = db
      .insert(logEntries)
      .values({ source, level, message })
      .returning()
      .all();

    broadcast("log:entry", entry);

    reply.status(201);
    return entry;
  });
}
