import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { wsRoutes } from "./ws/handler.js";

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

// Health check
server.get("/api/health", async () => {
  return { status: "ok", uptime: process.uptime() };
});

// Start
const start = async () => {
  try {
    await server.listen({ port: 4321, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
