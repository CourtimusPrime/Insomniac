import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { credentials } from "../db/schema/credentials.js";
import { workspaces } from "../db/schema/index.js";
import { encryptApiKey } from "../crypto/keys.js";

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

/** Strip encrypted secrets from a credential row for safe API responses */
function redactSecrets(
  row: typeof credentials.$inferSelect,
): Record<string, unknown> {
  const { clientId: _cid, clientSecret: _cs, ...safe } = row;
  return { ...safe, clientId: "****", clientSecret: "****" };
}

export async function credentialRoutes(server: FastifyInstance) {
  const workspaceId = await getOrCreateDefaultWorkspace();

  // GET /api/credentials — list all credentials (secrets redacted)
  server.get<{ Querystring: { projectId?: string } }>(
    "/api/credentials",
    async (request) => {
      const { projectId } = request.query;

      const rows = projectId
        ? db
            .select()
            .from(credentials)
            .where(eq(credentials.projectId, projectId))
            .all()
        : db.select().from(credentials).all();

      return rows.map(redactSecrets);
    },
  );

  // POST /api/credentials — create a new credential (encrypts secrets)
  server.post<{
    Body: {
      name: string;
      providerName: string;
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      scopes: string[];
      projectId?: string | null;
    };
  }>(
    "/api/credentials",
    {
      schema: {
        body: {
          type: "object",
          required: [
            "name",
            "providerName",
            "clientId",
            "clientSecret",
            "redirectUri",
            "scopes",
          ],
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 200 },
            providerName: { type: "string", minLength: 1, maxLength: 200 },
            clientId: { type: "string", minLength: 1 },
            clientSecret: { type: "string", minLength: 1 },
            redirectUri: { type: "string", minLength: 1 },
            scopes: {
              type: "array",
              items: { type: "string" },
            },
            projectId: { type: ["string", "null"] },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        name,
        providerName,
        clientId,
        clientSecret,
        redirectUri,
        scopes,
        projectId,
      } = request.body;

      const id = crypto.randomUUID();

      db.insert(credentials)
        .values({
          id,
          workspaceId,
          name,
          providerName,
          clientId: encryptApiKey(clientId),
          clientSecret: encryptApiKey(clientSecret),
          redirectUri,
          scopes,
          projectId: projectId ?? null,
        })
        .run();

      const created = db
        .select()
        .from(credentials)
        .where(eq(credentials.id, id))
        .get();

      reply.code(201);
      return created ? redactSecrets(created) : null;
    },
  );

  // PUT /api/credentials/:id — update a credential
  server.put<{
    Params: { id: string };
    Body: {
      name?: string;
      providerName?: string;
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
      scopes?: string[];
      projectId?: string | null;
    };
  }>(
    "/api/credentials/:id",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 200 },
            providerName: { type: "string", minLength: 1, maxLength: 200 },
            clientId: { type: "string", minLength: 1 },
            clientSecret: { type: "string", minLength: 1 },
            redirectUri: { type: "string", minLength: 1 },
            scopes: {
              type: "array",
              items: { type: "string" },
            },
            projectId: { type: ["string", "null"] },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const existing = db
        .select()
        .from(credentials)
        .where(eq(credentials.id, id))
        .get();

      if (!existing) {
        reply.code(404);
        return { error: "Credential not found" };
      }

      const {
        name,
        providerName,
        clientId,
        clientSecret,
        redirectUri,
        scopes,
        projectId,
      } = request.body;

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (providerName !== undefined) updates.providerName = providerName;
      if (clientId !== undefined) updates.clientId = encryptApiKey(clientId);
      if (clientSecret !== undefined)
        updates.clientSecret = encryptApiKey(clientSecret);
      if (redirectUri !== undefined) updates.redirectUri = redirectUri;
      if (scopes !== undefined) updates.scopes = scopes;
      if (projectId !== undefined) updates.projectId = projectId;

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        db.update(credentials)
          .set(updates)
          .where(eq(credentials.id, id))
          .run();
      }

      const updated = db
        .select()
        .from(credentials)
        .where(eq(credentials.id, id))
        .get();

      return updated ? redactSecrets(updated) : null;
    },
  );

  // DELETE /api/credentials/:id — remove a credential
  server.delete<{ Params: { id: string } }>(
    "/api/credentials/:id",
    async (request, reply) => {
      const { id } = request.params;

      const existing = db
        .select()
        .from(credentials)
        .where(eq(credentials.id, id))
        .get();

      if (!existing) {
        reply.code(404);
        return { error: "Credential not found" };
      }

      db.delete(credentials).where(eq(credentials.id, id)).run();
      return reply.code(204).send();
    },
  );
}
