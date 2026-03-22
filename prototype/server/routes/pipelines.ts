import type { FastifyInstance } from "fastify";
import { eq, and, asc } from "drizzle-orm";
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

      if (pipeline.status === "running" || runningEngines.has(id)) {
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

      if (runningEngines.has(id)) {
        reply.code(409);
        return { error: "Pipeline engine is still active — wait for it to stop" };
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

  // ── Pipeline Stages ───────────────────────────────────────────────

  // GET /api/pipelines/:id/stages — list stages for a pipeline in sortOrder
  server.get<{ Params: { id: string } }>(
    "/api/pipelines/:id/stages",
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

      return db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.pipelineId, id))
        .orderBy(asc(pipelineStages.sortOrder))
        .all();
    },
  );

  // POST /api/pipelines/:id/stages — add a new stage to a pipeline
  server.post<{
    Params: { id: string };
    Body: {
      name: string;
      agentId?: string;
      model?: string;
      description?: string;
      sortOrder?: number;
    };
  }>(
    "/api/pipelines/:id/stages",
    {
      schema: {
        body: {
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

      const { name, agentId, model, description, sortOrder } = request.body;

      // Default sortOrder to one past the current max
      let order = sortOrder;
      if (order === undefined) {
        const existing = db
          .select()
          .from(pipelineStages)
          .where(eq(pipelineStages.pipelineId, id))
          .orderBy(asc(pipelineStages.sortOrder))
          .all();
        order = existing.length > 0
          ? existing[existing.length - 1].sortOrder + 1
          : 0;
      }

      const stageId = crypto.randomUUID();
      db.insert(pipelineStages)
        .values({ id: stageId, pipelineId: id, name, agentId, model, description, sortOrder: order })
        .run();

      const created = db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.id, stageId))
        .get();

      reply.code(201);
      return created;
    },
  );

  // PUT /api/pipelines/:pipelineId/stages/:stageId — update a stage
  server.put<{
    Params: { pipelineId: string; stageId: string };
    Body: {
      name?: string;
      agentId?: string;
      model?: string;
      description?: string;
      sortOrder?: number;
    };
  }>(
    "/api/pipelines/:pipelineId/stages/:stageId",
    {
      schema: {
        body: {
          type: "object",
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
    async (request, reply) => {
      const { pipelineId, stageId } = request.params;

      const stage = db
        .select()
        .from(pipelineStages)
        .where(
          and(
            eq(pipelineStages.id, stageId),
            eq(pipelineStages.pipelineId, pipelineId),
          ),
        )
        .get();

      if (!stage) {
        reply.code(404);
        return { error: "Stage not found" };
      }

      const updates: Record<string, unknown> = {};
      const body = request.body;
      if (body.name !== undefined) updates.name = body.name;
      if (body.agentId !== undefined) updates.agentId = body.agentId;
      if (body.model !== undefined) updates.model = body.model;
      if (body.description !== undefined) updates.description = body.description;
      if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

      if (Object.keys(updates).length > 0) {
        db.update(pipelineStages)
          .set(updates)
          .where(eq(pipelineStages.id, stageId))
          .run();
      }

      return db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.id, stageId))
        .get();
    },
  );

  // DELETE /api/pipelines/:pipelineId/stages/:stageId — remove a stage
  server.delete<{ Params: { pipelineId: string; stageId: string } }>(
    "/api/pipelines/:pipelineId/stages/:stageId",
    async (request, reply) => {
      const { pipelineId, stageId } = request.params;

      const stage = db
        .select()
        .from(pipelineStages)
        .where(
          and(
            eq(pipelineStages.id, stageId),
            eq(pipelineStages.pipelineId, pipelineId),
          ),
        )
        .get();

      if (!stage) {
        reply.code(404);
        return { error: "Stage not found" };
      }

      db.delete(pipelineStages)
        .where(eq(pipelineStages.id, stageId))
        .run();

      reply.code(204);
      return;
    },
  );

  // POST /api/pipelines/:id/steer — natural language steering commands
  server.post<{
    Params: { id: string };
    Body: { message: string };
  }>(
    "/api/pipelines/:id/steer",
    {
      schema: {
        body: {
          type: "object",
          required: ["message"],
          additionalProperties: false,
          properties: {
            message: { type: "string", minLength: 1, maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { message } = request.body;

      const pipeline = db
        .select()
        .from(pipelines)
        .where(eq(pipelines.id, id))
        .get();

      if (!pipeline) {
        reply.code(404);
        return { error: "Pipeline not found" };
      }

      const lower = message.toLowerCase().trim();

      // "pause"
      if (/^pause$/i.test(lower)) {
        const engine = runningEngines.get(id);
        if (!engine) {
          return { action: "pause", result: "Pipeline is not running" };
        }
        engine.pause();
        return { action: "pause", result: "Pipeline paused" };
      }

      // "resume"
      if (/^resume$/i.test(lower)) {
        if (pipeline.status !== "paused") {
          return { action: "resume", result: "Pipeline is not paused" };
        }
        const engine = new PipelineEngine(id);
        runningEngines.set(id, engine);
        engine.resume().finally(() => runningEngines.delete(id));
        return { action: "resume", result: "Pipeline resumed" };
      }

      // "cancel"
      if (/^cancel$/i.test(lower)) {
        const engine = runningEngines.get(id);
        if (!engine) {
          return { action: "cancel", result: "Pipeline is not running" };
        }
        await engine.cancel();
        runningEngines.delete(id);
        return { action: "cancel", result: "Pipeline cancelled" };
      }

      // "skip [stage name]"
      const skipMatch = lower.match(/^skip\s+(.+)$/);
      if (skipMatch) {
        const stageName = skipMatch[1];
        const stages = db
          .select()
          .from(pipelineStages)
          .where(eq(pipelineStages.pipelineId, id))
          .orderBy(asc(pipelineStages.sortOrder))
          .all();

        const matched = stages.find(
          (s) => s.name.toLowerCase().includes(stageName),
        );

        if (!matched) {
          return { action: "skip", result: `No stage matching "${stageName}" found` };
        }

        db.update(pipelineStages)
          .set({ status: "skipped" })
          .where(eq(pipelineStages.id, matched.id))
          .run();

        return { action: "skip", result: `Skipped stage "${matched.name}"` };
      }

      // "add [stage name]"
      const addMatch = message.match(/^add\s+(.+)$/i);
      if (addMatch) {
        const stageName = addMatch[1];
        const existing = db
          .select()
          .from(pipelineStages)
          .where(eq(pipelineStages.pipelineId, id))
          .orderBy(asc(pipelineStages.sortOrder))
          .all();

        const nextOrder =
          existing.length > 0
            ? existing[existing.length - 1].sortOrder + 1
            : 0;

        const stageId = crypto.randomUUID();
        db.insert(pipelineStages)
          .values({
            id: stageId,
            pipelineId: id,
            name: stageName,
            sortOrder: nextOrder,
          })
          .run();

        return { action: "add", result: `Added stage "${stageName}" at position ${nextOrder}` };
      }

      return { action: "unknown", result: `Unrecognised command. Try: skip [stage], add [stage], pause, resume, cancel` };
    },
  );

  // POST /api/pipelines/:pipelineId/stages/:stageId/skip — mark stage as skipped
  server.post<{ Params: { pipelineId: string; stageId: string } }>(
    "/api/pipelines/:pipelineId/stages/:stageId/skip",
    async (request, reply) => {
      const { pipelineId, stageId } = request.params;

      const stage = db
        .select()
        .from(pipelineStages)
        .where(
          and(
            eq(pipelineStages.id, stageId),
            eq(pipelineStages.pipelineId, pipelineId),
          ),
        )
        .get();

      if (!stage) {
        reply.code(404);
        return { error: "Stage not found" };
      }

      db.update(pipelineStages)
        .set({ status: "skipped" })
        .where(eq(pipelineStages.id, stageId))
        .run();

      return db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.id, stageId))
        .get();
    },
  );
}
