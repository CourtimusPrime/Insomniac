import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { providers, workspaces } from '../db/schema/index.js';
import { getModelsForProvider } from '../providers/models.js';
import { OllamaProvider } from '../providers/ollama.js';
import { ProviderRegistry } from '../providers/registry.js';
import { testProviderKey } from '../providers/test-key.js';

const PROVIDER_NAMES = [
  'anthropic',
  'openai',
  'google',
  'openrouter',
  'ollama',
  'custom',
] as const;

const SEED_PROVIDERS: {
  name: (typeof PROVIDER_NAMES)[number];
  displayName: string;
  baseUrl?: string;
}[] = [
  { name: 'anthropic', displayName: 'Anthropic' },
  { name: 'openai', displayName: 'OpenAI' },
  { name: 'google', displayName: 'Google' },
  { name: 'openrouter', displayName: 'OpenRouter' },
  { name: 'ollama', displayName: 'Ollama', baseUrl: 'http://localhost:11434' },
];

async function seedProvidersIfEmpty() {
  const existing = db.select().from(providers).all();
  if (existing.length > 0) return;

  // Get default workspace (already created by projectRoutes which registers first)
  const workspace = db.select().from(workspaces).limit(1).get();
  if (!workspace) return;

  for (const seed of SEED_PROVIDERS) {
    db.insert(providers)
      .values({
        workspaceId: workspace.id,
        name: seed.name,
        displayName: seed.displayName,
        baseUrl: seed.baseUrl,
        isActive: false,
      })
      .run();
  }
}

const registry = new ProviderRegistry();

export async function providerRoutes(server: FastifyInstance) {
  // Seed default providers on first run
  await seedProvidersIfEmpty();
  // GET /api/providers — list all providers (no decrypted keys)
  server.get('/api/providers', async () => {
    return registry.listProviders();
  });

  // POST /api/providers — add a new provider
  server.post<{
    Body: {
      workspaceId: string;
      name: (typeof PROVIDER_NAMES)[number];
      displayName: string;
      baseUrl?: string;
      apiKey?: string;
      isActive?: boolean;
    };
  }>(
    '/api/providers',
    {
      schema: {
        body: {
          type: 'object',
          required: ['workspaceId', 'name', 'displayName'],
          additionalProperties: false,
          properties: {
            workspaceId: { type: 'string', minLength: 1 },
            name: {
              type: 'string',
              enum: [...PROVIDER_NAMES],
            },
            displayName: { type: 'string', minLength: 1, maxLength: 100 },
            baseUrl: { type: 'string', maxLength: 500 },
            apiKey: { type: 'string', maxLength: 500 },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, apiKey, baseUrl } = request.body;

      // Test key before saving
      let keyTest: { valid: boolean; error?: string } | undefined;
      if (apiKey || name === 'ollama') {
        keyTest = await testProviderKey(name, apiKey ?? '', baseUrl);
        if (!keyTest.valid) {
          // Save anyway but mark inactive
          request.body.isActive = false;
        }
      }

      const created = registry.addProvider(request.body);
      reply.code(201);
      return { ...created, keyTest };
    },
  );

  // PUT /api/providers/:id — update provider config
  server.put<{
    Params: { id: string };
    Body: {
      displayName?: string;
      baseUrl?: string;
      apiKey?: string;
      isActive?: boolean;
    };
  }>(
    '/api/providers/:id',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            displayName: { type: 'string', minLength: 1, maxLength: 100 },
            baseUrl: { type: 'string', maxLength: 500 },
            apiKey: { type: 'string', maxLength: 500 },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { apiKey } = request.body;

      // If a new API key is provided, test it
      let keyTest: { valid: boolean; error?: string } | undefined;
      if (apiKey) {
        const provider = registry.getProvider(request.params.id);
        if (provider) {
          keyTest = await testProviderKey(
            provider.name,
            apiKey,
            request.body.baseUrl ?? provider.baseUrl,
          );
          if (!keyTest.valid) {
            request.body.isActive = false;
          }
        }
      }

      const updated = registry.updateProvider(request.params.id, request.body);
      if (!updated) {
        reply.code(404);
        return { error: 'Provider not found' };
      }
      return { ...updated, keyTest };
    },
  );

  // DELETE /api/providers/:id — remove a provider
  server.delete<{ Params: { id: string } }>(
    '/api/providers/:id',
    async (request, reply) => {
      const deleted = registry.removeProvider(request.params.id);
      if (!deleted) {
        reply.code(404);
        return { error: 'Provider not found' };
      }
      return reply.code(204).send();
    },
  );

  // GET /api/providers/ollama/models — live model list from Ollama
  // NOTE: This must be registered BEFORE the :id/models route so Fastify
  // doesn't treat "ollama" as a :id param.
  server.get<{ Querystring: { baseUrl?: string } }>(
    '/api/providers/ollama/models',
    async (_request, reply) => {
      const rawUrl = _request.query.baseUrl || 'http://localhost:11434';
      // SSRF protection: only allow http/https to localhost
      let parsed: URL;
      try {
        parsed = new URL(rawUrl);
      } catch {
        reply.code(400);
        return { error: 'Invalid baseUrl' };
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        reply.code(400);
        return { error: 'Only http/https allowed' };
      }
      const allowedHosts = [
        'localhost',
        '127.0.0.1',
        '::1',
        ...(process.env.OLLAMA_ALLOWED_HOSTS?.split(',') ?? []),
      ];
      if (!allowedHosts.includes(parsed.hostname)) {
        reply.code(400);
        return { error: 'baseUrl host not permitted' };
      }
      const baseUrl = parsed.origin;
      const ollama = new OllamaProvider(baseUrl);
      try {
        const models = await ollama.fetchModels();
        return models;
      } catch {
        reply.code(502);
        return { error: 'Failed to connect to Ollama' };
      }
    },
  );

  // GET /api/providers/:id/models — available models for a provider
  server.get<{ Params: { id: string } }>(
    '/api/providers/:id/models',
    async (request, reply) => {
      const provider = registry.getProvider(request.params.id);
      if (!provider) {
        reply.code(404);
        return { error: 'Provider not found' };
      }

      // Ollama: fetch live models from the instance
      if (provider.name === 'ollama') {
        const ollama = new OllamaProvider(provider.baseUrl ?? undefined);
        try {
          return await ollama.fetchModels();
        } catch {
          reply.code(502);
          return { error: 'Failed to connect to Ollama' };
        }
      }

      // Static providers: return built-in model definitions
      return getModelsForProvider(provider.name);
    },
  );
}
