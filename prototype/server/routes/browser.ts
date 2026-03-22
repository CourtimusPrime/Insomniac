import type { FastifyInstance } from "fastify";
import { PlaywrightAdapter } from "../browser/index.js";
import type { BrowserEngine } from "../browser/index.js";

/** Singleton browser instance shared across all routes. */
let engine: BrowserEngine | null = null;

function isRunning(): boolean {
  return engine !== null;
}

export async function browserRoutes(server: FastifyInstance): Promise<void> {
  // POST /api/browser/launch — start a browser instance
  server.post(
    "/api/browser/launch",
    async (_request, reply) => {
      if (isRunning()) {
        reply.code(400);
        return { error: "Browser is already running" };
      }

      engine = new PlaywrightAdapter();
      await engine.launch({ headless: true });

      return { success: true };
    },
  );

  // POST /api/browser/navigate — navigate to a URL
  server.post<{ Body: { url: string } }>(
    "/api/browser/navigate",
    {
      schema: {
        body: {
          type: "object",
          required: ["url"],
          properties: {
            url: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      if (!engine) {
        reply.code(400);
        return { error: "Browser is not running. Call /api/browser/launch first." };
      }

      await engine.navigate(request.body.url);
      return { success: true, url: request.body.url };
    },
  );

  // POST /api/browser/screenshot — capture a screenshot
  server.post(
    "/api/browser/screenshot",
    async (_request, reply) => {
      if (!engine) {
        reply.code(400);
        return { error: "Browser is not running. Call /api/browser/launch first." };
      }

      const image = await engine.screenshot();
      return { success: true, image };
    },
  );

  // POST /api/browser/evaluate — run JS in the page context
  server.post<{ Body: { script: string } }>(
    "/api/browser/evaluate",
    {
      schema: {
        body: {
          type: "object",
          required: ["script"],
          properties: {
            script: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      if (!engine) {
        reply.code(400);
        return { error: "Browser is not running. Call /api/browser/launch first." };
      }

      const result = await engine.evaluate(request.body.script);
      return { success: true, result };
    },
  );

  // POST /api/browser/close — shut down the browser
  server.post(
    "/api/browser/close",
    async (_request, reply) => {
      if (!engine) {
        reply.code(400);
        return { error: "Browser is not running" };
      }

      await engine.close();
      engine = null;
      return { success: true };
    },
  );

  // GET /api/browser/status — check if browser is running
  server.get(
    "/api/browser/status",
    async () => {
      return { running: isRunning() };
    },
  );
}
