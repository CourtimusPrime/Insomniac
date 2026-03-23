import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { templates } from '../db/schema/index.js';
import { MarketplaceClient } from '../marketplace/client.js';
import type { MarketplaceItemType, TrustTier } from '../marketplace/types.js';

const client = new MarketplaceClient();

/** Helper: resolve default workspace ID (duplicated — consider extracting). */
async function getOrCreateDefaultWorkspace(): Promise<string> {
  const { workspaces } = await import('../db/schema/index.js');
  const DEFAULT_WORKSPACE_NAME = 'Default Workspace';

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

export async function marketplaceRoutes(server: FastifyInstance) {
  // GET /api/marketplace — paginated list with optional filters
  server.get<{
    Querystring: {
      type?: MarketplaceItemType;
      trustTier?: TrustTier;
      search?: string;
      page?: string;
      limit?: string;
    };
  }>(
    '/api/marketplace',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['workflow', 'agent-config', 'template', 'mcp-adapter'],
            },
            trustTier: {
              type: 'string',
              enum: ['community', 'verified', 'official'],
            },
            search: { type: 'string', maxLength: 200 },
            page: { type: 'string' },
            limit: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { type, trustTier, search, page, limit } = request.query;

      const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
      const limitNum = Math.min(
        50,
        Math.max(1, parseInt(limit ?? '20', 10) || 20),
      );

      const allItems = await client.fetchItems({
        type,
        trustTier,
        search,
      });

      const total = allItems.length;
      const start = (pageNum - 1) * limitNum;
      const items = allItems.slice(start, start + limitNum);

      return {
        items,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    },
  );

  // GET /api/marketplace/:id — single item detail
  server.get<{ Params: { id: string } }>(
    '/api/marketplace/:id',
    async (request, reply) => {
      const { id } = request.params;
      const item = await client.getItem(id);

      if (!item) {
        reply.code(404);
        return { error: 'Marketplace item not found' };
      }

      return item;
    },
  );

  // POST /api/marketplace/:id/install — download and install an item
  server.post<{
    Params: { id: string };
    Body: { workspaceId?: string };
  }>(
    '/api/marketplace/:id/install',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Get item metadata
      const item = await client.getItem(id);
      if (!item) {
        reply.code(404);
        return { error: 'Marketplace item not found' };
      }

      // Download item payload
      const payload = await client.downloadItem(id);
      if (!payload) {
        reply.code(500);
        return { error: 'Failed to download marketplace item' };
      }

      const workspaceId =
        request.body?.workspaceId ?? (await getOrCreateDefaultWorkspace());

      // Install as a template in the local DB
      const templateId = crypto.randomUUID();
      db.insert(templates)
        .values({
          id: templateId,
          workspaceId,
          name: item.name,
          description: item.description,
          category: item.type,
          chainDefinition: payload.chainDefinition ?? null,
          author: item.author,
          version: item.version,
          isBuiltIn: false,
        })
        .run();

      const created = db
        .select()
        .from(templates)
        .where(eq(templates.id, templateId))
        .get();

      reply.code(201);
      return {
        installed: true,
        template: created,
        source: {
          marketplaceId: item.id,
          name: item.name,
          version: item.version,
        },
      };
    },
  );
}
