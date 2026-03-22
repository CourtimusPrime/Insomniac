import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { workspaces, projects } from "../db/schema/index.js";

const DEFAULT_WORKSPACE_NAME = "Default";

const SEED_PROJECTS = [
  { name: "Aether-OS", language: "Rust", status: "building" as const },
  { name: "Nova-Protocol", language: "TypeScript", status: "idle" as const },
  { name: "Lumina-API", language: "Python", status: "error" as const },
  { name: "Void-Shell", language: "Go", status: "completed" as const },
];

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

async function seedIfEmpty(workspaceId: string) {
  const count = db.select().from(projects).all();
  if (count.length > 0) return;

  for (const seed of SEED_PROJECTS) {
    db.insert(projects)
      .values({
        workspaceId,
        name: seed.name,
        language: seed.language,
        status: seed.status,
      })
      .run();
  }
}

export async function projectRoutes(server: FastifyInstance) {
  // Ensure default workspace and seed data on plugin load
  const workspaceId = await getOrCreateDefaultWorkspace();
  await seedIfEmpty(workspaceId);

  // GET /api/projects — list all projects for default workspace
  server.get("/api/projects", async () => {
    return db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .all();
  });

  // POST /api/projects — create a new project
  server.post<{ Body: { name: string; language?: string; repoUrl?: string; path?: string } }>(
    "/api/projects",
    {
      schema: {
        body: {
          type: "object",
          required: ["name"],
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            language: { type: "string", maxLength: 50 },
            repoUrl: { type: "string", format: "uri", maxLength: 500 },
            path: { type: "string", maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, language, repoUrl, path } = request.body;
      const id = crypto.randomUUID();

      db.insert(projects)
        .values({ id, workspaceId, name, language, repoUrl, path })
        .run();

      const created = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();

      reply.code(201);
      return created;
    },
  );

  // PUT /api/projects/:id — update a project
  server.put<{ Params: { id: string }; Body: Partial<{ name: string; status: "idle" | "building" | "completed" | "error"; language: string; repoUrl: string; path: string }> }>(
    "/api/projects/:id",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            status: { type: "string", enum: ["idle", "building", "completed", "error"] },
            language: { type: "string", maxLength: 50 },
            repoUrl: { type: "string", format: "uri", maxLength: 500 },
            path: { type: "string", maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const existing = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();

      if (!existing) {
        reply.code(404);
        return { error: "Project not found" };
      }

      const { name, status, language, repoUrl, path } = request.body;
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (status !== undefined) updates.status = status;
      if (language !== undefined) updates.language = language;
      if (repoUrl !== undefined) updates.repoUrl = repoUrl;
      if (path !== undefined) updates.path = path;

      db.update(projects)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .run();

      return db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();
    },
  );

  // DELETE /api/projects/:id — delete a project
  server.delete<{ Params: { id: string } }>(
    "/api/projects/:id",
    async (request, reply) => {
      const { id } = request.params;

      const existing = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();

      if (!existing) {
        reply.code(404);
        return { error: "Project not found" };
      }

      db.delete(projects).where(eq(projects.id, id)).run();
      reply.code(204);
    },
  );
}
