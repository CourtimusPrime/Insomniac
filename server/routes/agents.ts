import { eq, ne } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { agents } from '../db/schema/index.js';
import { broadcast } from '../ws/handler.js';

export async function agentRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/agents/active — currently active (non-idle) agents
  server.get('/api/agents/active', async () => {
    const rows = db
      .select({
        id: agents.id,
        name: agents.name,
        role: agents.role,
        model: agents.model,
        provider: agents.provider,
        status: agents.status,
        currentTask: agents.currentTask,
        progress: agents.progress,
      })
      .from(agents)
      .where(ne(agents.status, 'idle'))
      .all();

    return rows;
  });

  // PATCH /api/agents/:id/status — update agent status (and broadcast via WebSocket)
  server.patch<{
    Params: { id: string };
    Body: { status?: string; currentTask?: string; progress?: number };
  }>(
    '/api/agents/:id/status',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['idle', 'working', 'paused', 'error'],
            },
            currentTask: { type: 'string' },
            progress: { type: 'number', minimum: 0, maximum: 100 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { status, currentTask, progress } = request.body;

      const updates: Record<string, unknown> = {};
      if (status !== undefined) updates.status = status;
      if (currentTask !== undefined) updates.currentTask = currentTask;
      if (progress !== undefined) updates.progress = progress;

      if (Object.keys(updates).length === 0) {
        reply.status(400);
        return { error: 'No fields to update' };
      }

      const [updated] = db
        .update(agents)
        .set(updates)
        .where(eq(agents.id, id))
        .returning()
        .all();

      if (!updated) {
        reply.status(404);
        return { error: 'Agent not found' };
      }

      broadcast('agent:status', updated);

      return updated;
    },
  );
}
