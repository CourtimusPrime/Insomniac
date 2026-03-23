import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { projectPreferences } from '../db/schema/index.js';

export async function preferencesRoutes(server: FastifyInstance) {
  // GET /api/projects/:id/preferences — get project's model preferences
  server.get<{ Params: { id: string } }>(
    '/api/projects/:id/preferences',
    async (request, reply) => {
      const prefs = db
        .select()
        .from(projectPreferences)
        .where(eq(projectPreferences.projectId, request.params.id))
        .get();

      if (!prefs) {
        reply.code(404);
        return { error: 'No preferences found for this project' };
      }

      return prefs;
    },
  );

  // PUT /api/projects/:id/preferences — upsert project model preferences
  server.put<{
    Params: { id: string };
    Body: {
      providerId: string;
      defaultModel?: string;
      taskTypeOverrides?: Record<string, string>;
    };
  }>(
    '/api/projects/:id/preferences',
    {
      schema: {
        body: {
          type: 'object',
          required: ['providerId'],
          additionalProperties: false,
          properties: {
            providerId: { type: 'string', minLength: 1 },
            defaultModel: { type: 'string', maxLength: 200 },
            taskTypeOverrides: {
              type: 'object',
              additionalProperties: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const projectId = request.params.id;
      const { providerId, defaultModel, taskTypeOverrides } = request.body;

      const existing = db
        .select()
        .from(projectPreferences)
        .where(eq(projectPreferences.projectId, projectId))
        .get();

      if (existing) {
        // Update existing preferences
        const updates: Record<string, unknown> = { providerId };
        if (defaultModel !== undefined) updates.defaultModel = defaultModel;
        if (taskTypeOverrides !== undefined)
          updates.taskTypeOverrides = taskTypeOverrides;

        db.update(projectPreferences)
          .set(updates)
          .where(eq(projectPreferences.projectId, projectId))
          .run();

        const updated = db
          .select()
          .from(projectPreferences)
          .where(eq(projectPreferences.projectId, projectId))
          .get();

        return updated;
      }

      // Create new preferences
      const id = crypto.randomUUID();
      db.insert(projectPreferences)
        .values({
          id,
          projectId,
          providerId,
          defaultModel: defaultModel ?? null,
          taskTypeOverrides: taskTypeOverrides ?? null,
        })
        .run();

      const created = db
        .select()
        .from(projectPreferences)
        .where(eq(projectPreferences.id, id))
        .get();

      reply.code(201);
      return created;
    },
  );
}
