import type { FastifyInstance } from "fastify";
import { McpConnectionManager } from "../integrations/mcp-manager.js";

/** Singleton MCP connection manager (workspace-global) */
const manager = new McpConnectionManager();

export async function mcpRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/mcp/connections — list all MCP connections
  server.get("/api/mcp/connections", async () => {
    return manager.listConnections();
  });

  // POST /api/mcp/connections — connect a new MCP server
  server.post<{
    Body: { name: string; command: string; args?: string[]; env?: Record<string, string> };
  }>("/api/mcp/connections", async (request, reply) => {
    const { name, command, args, env } = request.body ?? {};

    if (!name || typeof name !== "string") {
      reply.code(400);
      return { error: "name is required and must be a string" };
    }

    if (!command || typeof command !== "string") {
      reply.code(400);
      return { error: "command is required and must be a string" };
    }

    // Security: reject absolute paths and path traversal in command
    if (command.includes("/") || command.includes("\\") || command.includes("..")) {
      reply.code(400);
      return { error: "command must be a binary name, not a path" };
    }

    // Security: block dangerous env vars that enable code injection
    const BLOCKED_ENV_KEYS = new Set(["PATH", "LD_PRELOAD", "LD_LIBRARY_PATH", "NODE_OPTIONS", "PYTHONPATH"]);
    const safeEnv = env
      ? Object.fromEntries(Object.entries(env).filter(([k]) => !BLOCKED_ENV_KEYS.has(k)))
      : undefined;

    const result = manager.connect({ name, command, args, env: safeEnv });

    if (!result.success) {
      reply.code(409);
      return { error: result.error };
    }

    reply.code(201);
    return manager.getConnection(name);
  });

  // DELETE /api/mcp/connections/:name — disconnect an MCP server
  server.delete<{ Params: { name: string } }>(
    "/api/mcp/connections/:name",
    async (request, reply) => {
      const { name } = request.params;

      const result = manager.disconnect(name);

      if (!result.success) {
        reply.code(404);
        return { error: result.error };
      }

      return { success: true };
    },
  );

  // GET /api/mcp/connections/:name/status — get connection status
  server.get<{ Params: { name: string } }>(
    "/api/mcp/connections/:name/status",
    async (request, reply) => {
      const { name } = request.params;

      const connection = manager.getConnection(name);

      if (!connection) {
        reply.code(404);
        return { error: `Connection "${name}" not found` };
      }

      return connection;
    },
  );
}
