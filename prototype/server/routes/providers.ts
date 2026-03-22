import type { FastifyInstance } from "fastify";
import { ProviderRegistry } from "../providers/registry.js";
import { getModelsForProvider } from "../providers/models.js";
import { OllamaProvider } from "../providers/ollama.js";

const PROVIDER_NAMES = [
  "anthropic",
  "openai",
  "google",
  "openrouter",
  "ollama",
  "custom",
] as const;

const registry = new ProviderRegistry();

export async function providerRoutes(server: FastifyInstance) {
  // GET /api/providers — list all providers (no decrypted keys)
  server.get("/api/providers", async () => {
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
    "/api/providers",
    {
      schema: {
        body: {
          type: "object",
          required: ["workspaceId", "name", "displayName"],
          additionalProperties: false,
          properties: {
            workspaceId: { type: "string", minLength: 1 },
            name: {
              type: "string",
              enum: [...PROVIDER_NAMES],
            },
            displayName: { type: "string", minLength: 1, maxLength: 100 },
            baseUrl: { type: "string", maxLength: 500 },
            apiKey: { type: "string", maxLength: 500 },
            isActive: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const created = registry.addProvider(request.body);
      reply.code(201);
      return created;
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
    "/api/providers/:id",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            displayName: { type: "string", minLength: 1, maxLength: 100 },
            baseUrl: { type: "string", maxLength: 500 },
            apiKey: { type: "string", maxLength: 500 },
            isActive: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const updated = registry.updateProvider(request.params.id, request.body);
      if (!updated) {
        reply.code(404);
        return { error: "Provider not found" };
      }
      return updated;
    },
  );

  // DELETE /api/providers/:id — remove a provider
  server.delete<{ Params: { id: string } }>(
    "/api/providers/:id",
    async (request, reply) => {
      const deleted = registry.removeProvider(request.params.id);
      if (!deleted) {
        reply.code(404);
        return { error: "Provider not found" };
      }
      return reply.code(204).send();
    },
  );

  // GET /api/providers/ollama/models — live model list from Ollama
  // NOTE: This must be registered BEFORE the :id/models route so Fastify
  // doesn't treat "ollama" as a :id param.
  server.get<{ Querystring: { baseUrl?: string } }>(
    "/api/providers/ollama/models",
    async (_request, reply) => {
      const baseUrl = _request.query.baseUrl || undefined;
      const ollama = new OllamaProvider(baseUrl);
      try {
        const models = await ollama.fetchModels();
        return models;
      } catch {
        reply.code(502);
        return { error: "Failed to connect to Ollama" };
      }
    },
  );

  // GET /api/providers/:id/models — available models for a provider
  server.get<{ Params: { id: string } }>(
    "/api/providers/:id/models",
    async (request, reply) => {
      const provider = registry.getProvider(request.params.id);
      if (!provider) {
        reply.code(404);
        return { error: "Provider not found" };
      }

      // Ollama: fetch live models from the instance
      if (provider.name === "ollama") {
        const ollama = new OllamaProvider(provider.baseUrl ?? undefined);
        try {
          return await ollama.fetchModels();
        } catch {
          reply.code(502);
          return { error: "Failed to connect to Ollama" };
        }
      }

      // Static providers: return built-in model definitions
      return getModelsForProvider(provider.name);
    },
  );
}
