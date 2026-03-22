import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { db } from "../db/connection.js";
import { settings, workspaces } from "../db/schema/index.js";
import { SlackNotifier } from "../integrations/slack.js";

function getDefaultWorkspaceId(): string | undefined {
  const ws = db.select().from(workspaces).limit(1).get();
  return ws?.id;
}

const slackNotifier = new SlackNotifier();

export async function settingsRoutes(server: FastifyInstance) {
  // GET /api/settings/:key — get a setting by key
  server.get<{ Params: { key: string } }>(
    "/api/settings/:key",
    async (request, reply) => {
      const workspaceId = getDefaultWorkspaceId();
      if (!workspaceId) {
        reply.code(404);
        return { error: "No workspace found" };
      }

      const row = db
        .select()
        .from(settings)
        .where(and(eq(settings.workspaceId, workspaceId), eq(settings.key, request.params.key)))
        .get();

      if (!row) {
        return { key: request.params.key, value: null };
      }

      return { key: row.key, value: row.value };
    },
  );

  // PUT /api/settings/:key — upsert a setting
  server.put<{
    Params: { key: string };
    Body: { value: unknown; category?: string };
  }>(
    "/api/settings/:key",
    {
      schema: {
        body: {
          type: "object",
          required: ["value"],
          properties: {
            value: {},
            category: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const workspaceId = getDefaultWorkspaceId();
      if (!workspaceId) {
        reply.code(404);
        return { error: "No workspace found" };
      }

      const key = request.params.key;
      const { value, category } = request.body;

      const existing = db
        .select()
        .from(settings)
        .where(and(eq(settings.workspaceId, workspaceId), eq(settings.key, key)))
        .get();

      if (existing) {
        db.update(settings)
          .set({ value: JSON.stringify(value), category: category ?? existing.category })
          .where(eq(settings.id, existing.id))
          .run();
      } else {
        db.insert(settings)
          .values({
            workspaceId,
            key,
            value: JSON.stringify(value),
            category: category ?? "notifications",
          })
          .run();
      }

      return { key, value };
    },
  );

  // POST /api/settings/slack/test — send a test Slack message
  server.post<{ Body: { webhookUrl: string } }>(
    "/api/settings/slack/test",
    {
      schema: {
        body: {
          type: "object",
          required: ["webhookUrl"],
          properties: {
            webhookUrl: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { webhookUrl } = request.body;

      const result = await slackNotifier.sendMessage(webhookUrl, {
        text: "Insomniac test notification — your Slack webhook is working!",
      });

      if (!result.success) {
        reply.code(400);
        return { success: false, error: result.error };
      }

      return { success: true };
    },
  );
}
