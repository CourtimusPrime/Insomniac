import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { pipelines, pipelineStages } from "../db/schema/index.js";
import { PipelineEngine } from "../pipeline/engine.js";

/** Registry of running PipelineEngine instances so we can pause/cancel them. */
const runningEngines = new Map<string, PipelineEngine>();

export async function pipelineRoutes(server: FastifyInstance) {
  // GET /api/pipelines?projectId=X — list pipelines for a project
  server.get<{ Querystring: { projectId: string } }>(
    "/api/pipelines",
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
        .from(pipelines)
        .where(eq(pipelines.projectId, projectId))
        .all();
    },
  );

  // POST /api/pipelines — create a new pipeline with optional stages
  server.post<{
    Body: {
      projectId: string;
      workspaceId: string;
      name: string;
      stages?: Array<{
        name: string;
        agentId?: string;
        model?: string;
        description?: string;
        sortOrder?: number;
      }>;
    };
  }>(
    "/api/pipelines",
    {
      schema: {
        body: {
          type: "object",
          required: ["projectId", "workspaceId", "name"],
          additionalProperties: false,
          properties: {
            projectId: { type: "string", minLength: 1 },
            workspaceId: { type: "string", minLength: 1 },
            name: { type: "string", minLength: 1, maxLength: 200 },
            stages: {
              type: "array",
              items: {
                type: "object",
                required: ["name"],
                additionalProperties: false,
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 200 },
                  agentId: { type: "string" },
                  model: { type: "string", maxLength: 100 },
                  description: { type: "string", maxLength: 2000 },
                  sortOrder: { type: "integer", minimum: 0 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, workspaceId, name, stages } = request.body;
      const pipelineId = crypto.randomUUID();

      db.insert(pipelines)
        .values({ id: pipelineId, projectId, workspaceId, name })
        .run();

      // Insert stages if provided
      if (stages && stages.length > 0) {
        for (let i = 0; i < stages.length; i++) {
          const s = stages[i];
          db.insert(pipelineStages)
            .values({
              pipelineId,
              name: s.name,
              agentId: s.agentId,
              model: s.model,
              description: s.description,
              sortOrder: s.sortOrder ?? i,
            })
            .run();
        }
      }

      const created = db
        .select()
        .from(pipelines)
        .where(eq(pipelines.id, pipelineId))
        .get();

      reply.code(201);
      return created;
    },
  );

  // POST /api/pipelines/:id/run — start pipeline execution
  server.post<{ Params: { id: string } }>(
    "/api/pipelines/:id/run",
    async (request, reply) => {
      const { id } = request.params;

      const pipeline = db
        .select()
        .from(pipelines)
        .where(eq(pipelines.id, id))
        .get();

      if (!pipeline) {
        reply.code(404);
        return { error: "Pipeline not found" };
      }

      if (pipeline.status === "running") {
        reply.code(409);
        return { error: "Pipeline is already running" };
      }

      const engine = new PipelineEngine(id);
      runningEngines.set(id, engine);

      // Fire and forget — engine runs in the background
      engine.run().finally(() => {
        runningEngines.delete(id);
      });

      reply.code(202);
      return { pipelineId: id, status: "running" };
    },
  );

  // POST /api/pipelines/:id/pause — pause a running pipeline
  server.post<{ Params: { id: string } }>(
    "/api/pipelines/:id/pause",
    async (request, reply) => {
      const { id } = request.params;

      const engine = runningEngines.get(id);
      if (!engine) {
        reply.code(409);
        return { error: "Pipeline is not running" };
      }

      engine.pause();
      return { pipelineId: id, status: "paused" };
    },
  );

  // POST /api/pipelines/:id/resume — resume a paused pipeline
  server.post<{ Params: { id: string } }>(
    "/api/pipelines/:id/resume",
    async (request, reply) => {
      const { id } = request.params;

      const pipeline = db
        .select()
        .from(pipelines)
        .where(eq(pipelines.id, id))
        .get();

      if (!pipeline) {
        reply.code(404);
        return { error: "Pipeline not found" };
      }

      if (pipeline.status !== "paused") {
        reply.code(409);
        return { error: "Pipeline is not paused" };
      }

      const engine = new PipelineEngine(id);
      runningEngines.set(id, engine);

      // Fire and forget — engine resumes in the background
      engine.resume().finally(() => {
        runningEngines.delete(id);
      });

      reply.code(202);
      return { pipelineId: id, status: "running" };
    },
  );

  // POST /api/pipelines/:id/cancel — cancel a running pipeline
  server.post<{ Params: { id: string } }>(
    "/api/pipelines/:id/cancel",
    async (request, reply) => {
      const { id } = request.params;

      const engine = runningEngines.get(id);
      if (!engine) {
        reply.code(409);
        return { error: "Pipeline is not running" };
      }

      await engine.cancel();
      runningEngines.delete(id);
      return { pipelineId: id, status: "cancelled" };
    },
  );
}
