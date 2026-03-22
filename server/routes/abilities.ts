import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { workspaces, abilities } from "../db/schema/index.js";
import { parseSkillMd } from "../abilities/skill-parser.js";

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

export async function abilityRoutes(server: FastifyInstance) {
  const workspaceId = await getOrCreateDefaultWorkspace();

  // GET /api/abilities — list all abilities for the default workspace
  server.get("/api/abilities", async () => {
    return db
      .select()
      .from(abilities)
      .where(eq(abilities.workspaceId, workspaceId))
      .all();
  });

  // GET /api/abilities/:id — get a single ability with full config
  server.get<{ Params: { id: string } }>(
    "/api/abilities/:id",
    async (request, reply) => {
      const { id } = request.params;

      const ability = db
        .select()
        .from(abilities)
        .where(eq(abilities.id, id))
        .get();

      if (!ability) {
        reply.code(404);
        return { error: "Ability not found" };
      }

      return ability;
    },
  );

  // POST /api/abilities — create a new ability
  server.post<{
    Body: {
      name: string;
      type: "skill" | "plugin" | "mcp";
      config?: Record<string, unknown>;
      version?: string;
      active?: boolean;
    };
  }>(
    "/api/abilities",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "type"],
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 200 },
            type: { type: "string", enum: ["skill", "plugin", "mcp"] },
            config: { type: "object" },
            version: { type: "string", maxLength: 50 },
            active: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, type, config, version, active } = request.body;
      const id = crypto.randomUUID();

      db.insert(abilities)
        .values({
          id,
          workspaceId,
          name,
          type,
          config: config ?? null,
          version: version ?? null,
          active: active ?? true,
        })
        .run();

      const created = db
        .select()
        .from(abilities)
        .where(eq(abilities.id, id))
        .get();

      reply.code(201);
      return created;
    },
  );

  // PUT /api/abilities/:id — update an ability
  server.put<{
    Params: { id: string };
    Body: {
      name?: string;
      type?: "skill" | "plugin" | "mcp";
      config?: Record<string, unknown>;
      version?: string;
      active?: boolean;
    };
  }>(
    "/api/abilities/:id",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 200 },
            type: { type: "string", enum: ["skill", "plugin", "mcp"] },
            config: { type: "object" },
            version: { type: "string", maxLength: 50 },
            active: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const existing = db
        .select()
        .from(abilities)
        .where(eq(abilities.id, id))
        .get();

      if (!existing) {
        reply.code(404);
        return { error: "Ability not found" };
      }

      const { name, type, config, version, active } = request.body;
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (type !== undefined) updates.type = type;
      if (config !== undefined) updates.config = config;
      if (version !== undefined) updates.version = version;
      if (active !== undefined) updates.active = active;

      if (Object.keys(updates).length > 0) {
        db.update(abilities)
          .set(updates)
          .where(eq(abilities.id, id))
          .run();
      }

      return db
        .select()
        .from(abilities)
        .where(eq(abilities.id, id))
        .get();
    },
  );

  // DELETE /api/abilities/:id — remove an ability
  server.delete<{ Params: { id: string } }>(
    "/api/abilities/:id",
    async (request, reply) => {
      const { id } = request.params;

      const existing = db
        .select()
        .from(abilities)
        .where(eq(abilities.id, id))
        .get();

      if (!existing) {
        reply.code(404);
        return { error: "Ability not found" };
      }

      db.delete(abilities).where(eq(abilities.id, id)).run();
      return reply.code(204).send();
    },
  );

  // POST /api/abilities/import-skill — import a Claude SKILL.md as an ability
  server.post<{ Body: string }>(
    "/api/abilities/import-skill",
    {
      schema: {
        body: { type: "string", maxLength: 50000 },
      },
    },
    async (request, reply) => {
      let parsed;
      try {
        parsed = parseSkillMd(request.body);
      } catch (err) {
        reply.code(400);
        return { error: (err as Error).message };
      }

      const id = crypto.randomUUID();

      db.insert(abilities)
        .values({
          id,
          workspaceId,
          name: parsed.name,
          type: parsed.type,
          config: parsed.config,
        })
        .run();

      const created = db
        .select()
        .from(abilities)
        .where(eq(abilities.id, id))
        .get();

      reply.code(201);
      return created;
    },
  );
}
