import { desc, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { usageRecords } from '../db/schema/index.js';

/** Prevent CSV formula injection by prefixing dangerous first characters with a single quote. */
function sanitizeCsvCell(value: string): string {
  if (value.length === 0) return value;
  const first = value[0];
  if (
    first === '=' ||
    first === '+' ||
    first === '-' ||
    first === '@' ||
    first === '\t' ||
    first === '\r'
  ) {
    return `'${value}`;
  }
  return value;
}

export async function usageRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/usage/summary — total tokens, cost, most active agent, most used model
  server.get('/api/usage/summary', async () => {
    const totals = db
      .select({
        totalInputTokens: sql<number>`coalesce(sum(${usageRecords.inputTokens}), 0)`,
        totalOutputTokens: sql<number>`coalesce(sum(${usageRecords.outputTokens}), 0)`,
        estimatedCost: sql<number>`coalesce(sum(${usageRecords.estimatedCost}), 0)`,
      })
      .from(usageRecords)
      .get();

    const topAgent = db
      .select({
        agentName: usageRecords.agentName,
        count: sql<number>`count(*)`,
      })
      .from(usageRecords)
      .groupBy(usageRecords.agentName)
      .orderBy(desc(sql`count(*)`))
      .limit(1)
      .get();

    const topModel = db
      .select({
        model: usageRecords.model,
        count: sql<number>`count(*)`,
      })
      .from(usageRecords)
      .groupBy(usageRecords.model)
      .orderBy(desc(sql`count(*)`))
      .limit(1)
      .get();

    return {
      totalTokens:
        (totals?.totalInputTokens ?? 0) + (totals?.totalOutputTokens ?? 0),
      totalInputTokens: totals?.totalInputTokens ?? 0,
      totalOutputTokens: totals?.totalOutputTokens ?? 0,
      estimatedCost: totals?.estimatedCost ?? 0,
      mostActiveAgent: topAgent?.agentName ?? null,
      mostUsedModel: topModel?.model ?? null,
    };
  });

  // GET /api/usage/timeline — time-series grouped by provider/model
  server.get<{ Querystring: { hours?: string } }>(
    '/api/usage/timeline',
    async (request) => {
      const hours = Number(request.query.hours) || 24;
      const cutoff = Math.floor(Date.now() / 1000) - hours * 3600;

      const rows = db
        .select({
          bucket: sql<string>`strftime('%Y-%m-%dT%H:00:00Z', ${usageRecords.createdAt}, 'unixepoch')`,
          provider: usageRecords.provider,
          model: usageRecords.model,
          inputTokens: sql<number>`coalesce(sum(${usageRecords.inputTokens}), 0)`,
          outputTokens: sql<number>`coalesce(sum(${usageRecords.outputTokens}), 0)`,
          estimatedCost: sql<number>`coalesce(sum(${usageRecords.estimatedCost}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(usageRecords)
        .where(sql`${usageRecords.createdAt} >= ${cutoff}`)
        .groupBy(
          sql`strftime('%Y-%m-%dT%H:00:00Z', ${usageRecords.createdAt}, 'unixepoch')`,
          usageRecords.provider,
          usageRecords.model,
        )
        .orderBy(sql`bucket`)
        .all();

      return rows;
    },
  );

  // GET /api/usage/breakdown — grouped by provider, model, agent, or project
  server.get<{ Querystring: { groupBy?: string } }>(
    '/api/usage/breakdown',
    async (request) => {
      const groupBy = request.query.groupBy ?? 'provider';

      const groupColumn =
        {
          provider: usageRecords.provider,
          model: usageRecords.model,
          agent: usageRecords.agentName,
          project: usageRecords.projectId,
        }[groupBy] ?? usageRecords.provider;

      const rows = db
        .select({
          group: groupColumn,
          inputTokens: sql<number>`coalesce(sum(${usageRecords.inputTokens}), 0)`,
          outputTokens: sql<number>`coalesce(sum(${usageRecords.outputTokens}), 0)`,
          toolCalls: sql<number>`coalesce(sum(${usageRecords.toolCalls}), 0)`,
          estimatedCost: sql<number>`coalesce(sum(${usageRecords.estimatedCost}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(usageRecords)
        .groupBy(groupColumn)
        .orderBy(desc(sql`count(*)`))
        .all();

      return rows;
    },
  );

  // GET /api/usage/export?format=csv — CSV export
  server.get<{ Querystring: { format?: string } }>(
    '/api/usage/export',
    async (request, reply) => {
      const format = request.query.format ?? 'csv';

      const rows = db
        .select()
        .from(usageRecords)
        .orderBy(desc(usageRecords.createdAt))
        .all();

      if (format === 'csv') {
        const headers = [
          'id',
          'workspaceId',
          'projectId',
          'pipelineId',
          'stageId',
          'agentName',
          'model',
          'provider',
          'inputTokens',
          'outputTokens',
          'toolCalls',
          'estimatedCost',
          'createdAt',
        ];
        const csvLines = [headers.join(',')];

        for (const row of rows) {
          csvLines.push(
            headers
              .map((h) => {
                const val = row[h as keyof typeof row];
                if (val === null || val === undefined) return '';
                if (val instanceof Date) return val.toISOString();
                return sanitizeCsvCell(String(val));
              })
              .join(','),
          );
        }

        reply.header('Content-Type', 'text/csv');
        reply.header(
          'Content-Disposition',
          'attachment; filename=usage-export.csv',
        );
        return csvLines.join('\n');
      }

      // Default: JSON
      return rows;
    },
  );
}
