import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { hooks } from '../db/schema/hooks.js';
import { workspaces } from '../db/schema/index.js';
import { HooksEngine } from '../hooks/engine.js';

const DEFAULT_WORKSPACE_NAME = 'Default';
const VALID_TRIGGERS = [
  'pre-stage',
  'post-stage',
  'on-decision',
  'on-agent-error',
  'on-pipeline-complete',
  'on-file-change',
  'on-test-fail',
  'on-test-pass',
  'scheduled',
] as const;

const VALID_ACTION_TYPES = ['shell', 'webhook', 'slack'] as const;

async function getOrCreateDefaultWorkspace(): Promise<string> {
  const existing = db
    .select()
    .from(workspaces)
    .where(eq(workspaces.name, DEFAULT_WORKSPACE_NAME))
    .get();

  if (existing) return existing.id;

  const id = crypto.randomUUID();
  db.insert(workspaces).values({ id, name: DEFAULT_WORKSPACE_NAME }).run();
  return id;
}

export async function hookRoutes(server: FastifyInstance) {
  const workspaceId = await getOrCreateDefaultWorkspace();
  const engine = new HooksEngine();

  // GET /api/hooks — list all hooks, optionally filtered by projectId
  server.get<{ Querystring: { projectId?: string } }>(
    '/api/hooks',
    async (request) => {
      const { projectId } = request.query;

      if (projectId) {
        return db
          .select()
          .from(hooks)
          .where(eq(hooks.projectId, projectId))
          .all();
      }

      return db.select().from(hooks).all();
    },
  );

  // POST /api/hooks — create a new hook
  server.post<{
    Body: {
      name: string;
      trigger: (typeof VALID_TRIGGERS)[number];
      action: { type: string; config: Record<string, unknown> };
      enabled?: boolean;
      projectId?: string | null;
    };
  }>(
    '/api/hooks',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'trigger', 'action'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            trigger: {
              type: 'string',
              enum: [...VALID_TRIGGERS],
            },
            action: {
              type: 'object',
              required: ['type', 'config'],
              properties: {
                type: {
                  type: 'string',
                  enum: [...VALID_ACTION_TYPES],
                },
                config: { type: 'object' },
              },
            },
            enabled: { type: 'boolean' },
            projectId: { type: ['string', 'null'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, trigger, action, enabled, projectId } = request.body;
      const id = crypto.randomUUID();

      db.insert(hooks)
        .values({
          id,
          workspaceId,
          name,
          trigger,
          action,
          enabled: enabled ?? true,
          projectId: projectId ?? null,
        })
        .run();

      const created = db.select().from(hooks).where(eq(hooks.id, id)).get();

      reply.code(201);
      return created;
    },
  );

  // PUT /api/hooks/:id — update a hook
  server.put<{
    Params: { id: string };
    Body: {
      name?: string;
      trigger?: (typeof VALID_TRIGGERS)[number];
      action?: { type: string; config: Record<string, unknown> };
      enabled?: boolean;
      projectId?: string | null;
    };
  }>(
    '/api/hooks/:id',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            trigger: {
              type: 'string',
              enum: [...VALID_TRIGGERS],
            },
            action: {
              type: 'object',
              required: ['type', 'config'],
              properties: {
                type: {
                  type: 'string',
                  enum: [...VALID_ACTION_TYPES],
                },
                config: { type: 'object' },
              },
            },
            enabled: { type: 'boolean' },
            projectId: { type: ['string', 'null'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const existing = db.select().from(hooks).where(eq(hooks.id, id)).get();

      if (!existing) {
        reply.code(404);
        return { error: 'Hook not found' };
      }

      const { name, trigger, action, enabled, projectId } = request.body;
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (trigger !== undefined) updates.trigger = trigger;
      if (action !== undefined) updates.action = action;
      if (enabled !== undefined) updates.enabled = enabled;
      if (projectId !== undefined) updates.projectId = projectId;

      if (Object.keys(updates).length > 0) {
        db.update(hooks).set(updates).where(eq(hooks.id, id)).run();
      }

      return db.select().from(hooks).where(eq(hooks.id, id)).get();
    },
  );

  // DELETE /api/hooks/:id — remove a hook
  server.delete<{ Params: { id: string } }>(
    '/api/hooks/:id',
    async (request, reply) => {
      const { id } = request.params;

      const existing = db.select().from(hooks).where(eq(hooks.id, id)).get();

      if (!existing) {
        reply.code(404);
        return { error: 'Hook not found' };
      }

      db.delete(hooks).where(eq(hooks.id, id)).run();
      return reply.code(204).send();
    },
  );

  // POST /api/hooks/:id/test — fire a hook manually for testing
  server.post<{ Params: { id: string } }>(
    '/api/hooks/:id/test',
    async (request, reply) => {
      const { id } = request.params;

      const hook = db.select().from(hooks).where(eq(hooks.id, id)).get();

      if (!hook) {
        reply.code(404);
        return { error: 'Hook not found' };
      }

      const result = await engine.executeHook(hook, {
        pipelineId: 'test',
        stageId: 'test',
        projectId: hook.projectId ?? undefined,
        status: 'test',
      });

      return result;
    },
  );
}
