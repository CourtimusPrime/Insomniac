import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { wsRoutes } from "./ws/handler.js";
import { projectRoutes } from "./routes/projects.js";
import { pipelineRoutes } from "./routes/pipelines.js";
import { decisionRoutes } from "./routes/decisions.js";
import { providerRoutes } from "./routes/providers.js";
import { preferencesRoutes } from "./routes/preferences.js";
import { localhostRoutes } from "./routes/localhost.js";
import { settingsRoutes } from "./routes/settings.js";
import { mcpRoutes } from "./routes/mcp.js";
import { abilityRoutes } from "./routes/abilities.js";
import { templateRoutes } from "./routes/templates.js";
import { marketplaceRoutes } from "./routes/marketplace.js";
import { browserRoutes } from "./routes/browser.js";
import { hookRoutes } from "./routes/hooks.js";
import { credentialRoutes } from "./routes/credentials.js";
import { backseatRoutes } from "./routes/backseat.js";
import { metricsRoutes } from "./routes/metrics.js";
import { usageRoutes } from "./routes/usage.js";
import { logRoutes } from "./routes/logs.js";
import { agentRoutes } from "./routes/agents.js";
import { authRoutes } from "./routes/auth.js";
import { registerAuthMiddleware } from "./hosted/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const server = Fastify({ logger: true });

// CORS for localhost development
await server.register(cors, {
  origin: [
    "http://localhost:1420",
    "http://localhost:4321",
    "http://localhost:5173",
  ],
});

// WebSocket support
await server.register(websocket);
await server.register(wsRoutes);

// Serve Vite build output
await server.register(fastifyStatic, {
  root: resolve(__dirname, "../dist"),
  wildcard: false,
});

// Auth middleware (no-op in local mode, active in remote/hosted)
registerAuthMiddleware(server);

// Auth routes (only active in hosted/remote mode)
await server.register(authRoutes);

// API routes
await server.register(projectRoutes);
await server.register(pipelineRoutes);
await server.register(decisionRoutes);
await server.register(providerRoutes);
await server.register(preferencesRoutes);
await server.register(localhostRoutes);
await server.register(settingsRoutes);
await server.register(mcpRoutes);
await server.register(abilityRoutes);
await server.register(templateRoutes);
await server.register(marketplaceRoutes);
await server.register(browserRoutes);
await server.register(hookRoutes);
await server.register(credentialRoutes);
await server.register(backseatRoutes);
await server.register(metricsRoutes);
await server.register(usageRoutes);
await server.register(logRoutes);
await server.register(agentRoutes);

// Health check
server.get("/api/health", async () => {
  return { status: "ok", uptime: process.uptime() };
});

// Start
const start = async () => {
  try {
    await server.listen({ port: Number(process.env.PORT ?? 4321), host: process.env.HOST ?? "127.0.0.1" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
