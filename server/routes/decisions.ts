import type { FastifyInstance } from "fastify";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db/connection.js";
import { decisions } from "../db/schema/index.js";
import { broadcast } from "../ws/handler.js";
import { HooksEngine } from "../hooks/engine.js";

const hooksEngine = new HooksEngine();

export async function decisionRoutes(server: FastifyInstance) {
  // GET /api/decisions?projectId=X — list pending decisions for a project
  server.get<{ Querystring: { projectId: string } }>(
    "/api/decisions",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["projectId"],
          properties: {
            projectId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request) => {
      const { projectId } = request.query;
      return db
        .select()
        .from(decisions)
        .where(
          and(
            eq(decisions.projectId, projectId),
            isNull(decisions.resolution),
          ),
        )
        .all();
    },
  );

  // POST /api/decisions — create a new decision (called by pipeline engine when stage needs user input)
  server.post<{
    Body: {
      workspaceId: string;
      projectId: string;
      agentId?: string;
      stageId?: string;
      question: string;
      options?: string[];
    };
  }>(
    "/api/decisions",
    {
      schema: {
        body: {
          type: "object",
          required: ["workspaceId", "projectId", "question"],
          additionalProperties: false,
          properties: {
            workspaceId: { type: "string", minLength: 1 },
            projectId: { type: "string", minLength: 1 },
            agentId: { type: "string" },
            stageId: { type: "string" },
            question: { type: "string", minLength: 1, maxLength: 2000 },
            options: {
              type: "array",
              maxItems: 10,
              items: { type: "string", minLength: 1, maxLength: 500 },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { workspaceId, projectId, agentId, stageId, question, options } =
        request.body;

      const id = crypto.randomUUID();
      db.insert(decisions)
        .values({
          id,
          workspaceId,
          projectId,
          agentId,
          stageId,
          question,
          options: options ?? null,
        })
        .run();

      const created = db
        .select()
        .from(decisions)
        .where(eq(decisions.id, id))
        .get();

      broadcast("decision:created", created);

      // Fire on-decision hook
      hooksEngine.fire("on-decision", {
        pipelineId: stageId,
        projectId,
        stageId,
      });

      reply.code(201);
      return created;
    },
  );

  // PUT /api/decisions/:id — resolve a decision with chosen option or free-text override
  server.put<{
    Params: { id: string };
    Body: {
      resolution: string;
      autoDecide?: boolean;
    };
  }>(
    "/api/decisions/:id",
    {
      schema: {
        body: {
          type: "object",
          required: ["resolution"],
          additionalProperties: false,
          properties: {
            resolution: { type: "string", minLength: 1, maxLength: 4000 },
            autoDecide: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { resolution, autoDecide } = request.body;

      const decision = db
        .select()
        .from(decisions)
        .where(eq(decisions.id, id))
        .get();

      if (!decision) {
        reply.code(404);
        return { error: "Decision not found" };
      }

      if (decision.resolution !== null) {
        reply.code(409);
        return { error: "Decision is already resolved" };
      }

      const resolvedAt = new Date();
      const finalResolution = autoDecide
        ? `[auto-decide] ${resolution}`
        : resolution;

      db.update(decisions)
        .set({ resolution: finalResolution, resolvedAt })
        .where(eq(decisions.id, id))
        .run();

      const updated = db
        .select()
        .from(decisions)
        .where(eq(decisions.id, id))
        .get();

      broadcast("decision:resolved", updated);

      return updated;
    },
  );
}
