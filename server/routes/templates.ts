import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { templates, projects } from "../db/schema/index.js";
import { seedBuiltInTemplates } from "../templates/built-in.js";

export async function templateRoutes(server: FastifyInstance) {
  // Seed built-in templates on first load
  await seedBuiltInTemplates();

  // GET /api/templates — list all templates (built-in + user-created)
  server.get("/api/templates", async () => {
    return db.select().from(templates).all();
  });

  // GET /api/templates/:id — get a single template
  server.get<{ Params: { id: string } }>(
    "/api/templates/:id",
    async (request, reply) => {
      const { id } = request.params;

      const template = db
        .select()
        .from(templates)
        .where(eq(templates.id, id))
        .get();

      if (!template) {
        reply.code(404);
        return { error: "Template not found" };
      }

      return template;
    },
  );

  // POST /api/templates — create a user template from a chain definition
  server.post<{
    Body: {
      name: string;
      description?: string;
      category: "workflow" | "agent-config" | "template" | "mcp-adapter";
      chainDefinition: { version: number; nodes: unknown[]; edges: unknown[] };
      author?: string;
      version?: string;
      workspaceId: string;
    };
  }>(
    "/api/templates",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "category", "chainDefinition", "workspaceId"],
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 200 },
            description: { type: "string", maxLength: 1000 },
            category: {
              type: "string",
              enum: ["workflow", "agent-config", "template", "mcp-adapter"],
            },
            chainDefinition: {
              type: "object",
              required: ["version", "nodes", "edges"],
              properties: {
                version: { type: "number" },
                nodes: { type: "array" },
                edges: { type: "array" },
              },
            },
            author: { type: "string", maxLength: 100 },
            version: { type: "string", maxLength: 20 },
            workspaceId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, description, category, chainDefinition, author, version, workspaceId } =
        request.body;
      const id = crypto.randomUUID();

      db.insert(templates)
        .values({
          id,
          workspaceId,
          name,
          description,
          category,
          chainDefinition,
          author,
          version,
          isBuiltIn: false,
        })
        .run();

      const created = db
        .select()
        .from(templates)
        .where(eq(templates.id, id))
        .get();

      reply.code(201);
      return created;
    },
  );

  // POST /api/templates/:id/apply — apply a template to a project
  server.post<{
    Params: { id: string };
    Body: { projectId: string };
  }>(
    "/api/templates/:id/apply",
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

      const template = db
        .select()
        .from(templates)
        .where(eq(templates.id, id))
        .get();

      if (!template) {
        reply.code(404);
        return { error: "Template not found" };
      }

      const project = db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .get();

      if (!project) {
        reply.code(404);
        return { error: "Project not found" };
      }

      // Copy chainDefinition from template to project
      db.update(projects)
        .set({
          chainDefinition: template.chainDefinition,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))
        .run();

      // Increment install count
      db.update(templates)
        .set({ installCount: template.installCount + 1 })
        .where(eq(templates.id, id))
        .run();

      const updated = db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .get();

      return {
        project: updated,
        appliedTemplate: template.name,
      };
    },
  );

  // DELETE /api/templates/:id — delete a user template (cannot delete built-in)
  server.delete<{ Params: { id: string } }>(
    "/api/templates/:id",
    async (request, reply) => {
      const { id } = request.params;

      const template = db
        .select()
        .from(templates)
        .where(eq(templates.id, id))
        .get();

      if (!template) {
        reply.code(404);
        return { error: "Template not found" };
      }

      if (template.isBuiltIn) {
        reply.code(403);
        return { error: "Cannot delete built-in templates" };
      }

      db.delete(templates).where(eq(templates.id, id)).run();
      return reply.code(204).send();
    },
  );
}
