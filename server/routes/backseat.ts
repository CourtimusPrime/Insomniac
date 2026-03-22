import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { projects, pipelines, pipelineStages } from "../db/schema/index.js";
import { workspaces } from "../db/schema/index.js";
import { BackseatDriver, type Recommendation } from "../backseat/driver.js";

const DEFAULT_WORKSPACE_NAME = "Default";

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

// In-memory cache of recommendations per project, keyed by projectId
const recommendationsCache = new Map<
  string,
  { recommendations: (Recommendation & { id: string })[]; scannedAt: string }
>();

function addIds(recs: Recommendation[]): (Recommendation & { id: string })[] {
  return recs.map((r, i) => ({ ...r, id: `rec-${i}-${Date.now()}` }));
}

export async function backseatRoutes(server: FastifyInstance) {
  const workspaceId = await getOrCreateDefaultWorkspace();
  const driver = new BackseatDriver();

  // GET /api/backseat/recommendations?projectId=X — get recommendations for a project
  server.get<{ Querystring: { projectId?: string } }>(
    "/api/backseat/recommendations",
    async (request, reply) => {
      const { projectId } = request.query;

      if (!projectId) {
        reply.code(400);
        return { error: "projectId query parameter is required" };
      }

      const cached = recommendationsCache.get(projectId);
      if (cached) {
        return cached;
      }

      return { recommendations: [], scannedAt: null };
    },
  );

  // POST /api/backseat/scan — trigger a manual scan for a project
  server.post<{
    Body: { projectId: string };
  }>(
    "/api/backseat/scan",
    {
      schema: {
        body: {
          type: "object",
          required: ["projectId"],
          additionalProperties: false,
          properties: {
            projectId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request) => {
      const { projectId } = request.body;

      const project = db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .get();

      if (!project) {
        return { error: "Project not found", recommendations: [] };
      }

      // Use the project path if available, otherwise use the project name as a relative path
      const projectPath = project.path ?? project.name;
      const recs = await driver.scan(projectPath);
      const withIds = addIds(recs);
      const scannedAt = new Date().toISOString();

      recommendationsCache.set(projectId, {
        recommendations: withIds,
        scannedAt,
      });

      return { recommendations: withIds, scannedAt };
    },
  );

  // POST /api/backseat/recommendations/:id/run — create a pipeline stage from a recommendation
  server.post<{
    Params: { id: string };
    Body: { projectId: string };
  }>(
    "/api/backseat/recommendations/:id/run",
    {
      schema: {
        body: {
          type: "object",
          required: ["projectId"],
          additionalProperties: false,
          properties: {
            projectId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { projectId } = request.body;

      // Find the recommendation in cache
      const cached = recommendationsCache.get(projectId);
      const rec = cached?.recommendations.find((r) => r.id === id);

      if (!rec) {
        reply.code(404);
        return { error: "Recommendation not found" };
      }

      // Create a new pipeline for this recommendation
      const pipelineId = crypto.randomUUID();
      db.insert(pipelines)
        .values({
          id: pipelineId,
          projectId,
          workspaceId,
          name: `Fix: ${rec.message.slice(0, 100)}`,
        })
        .run();

      // Create a stage for the fix
      const stageId = crypto.randomUUID();
      db.insert(pipelineStages)
        .values({
          id: stageId,
          pipelineId,
          name: `${rec.type}: ${rec.file}`,
          description: rec.message,
          sortOrder: 0,
        })
        .run();

      const pipeline = db
        .select()
        .from(pipelines)
        .where(eq(pipelines.id, pipelineId))
        .get();

      reply.code(201);
      return { pipeline, stageId };
    },
  );
}
