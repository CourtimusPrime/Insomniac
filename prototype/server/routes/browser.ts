import type { FastifyInstance } from "fastify";
import { request as httpRequest } from "node:http";
import { PlaywrightAdapter } from "../browser/index.js";
import type { BrowserEngine } from "../browser/index.js";
import { getRunnerForProject } from "./localhost.js";
import { broadcast } from "../ws/handler.js";

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
      engine.onConsole((entry) => {
        broadcast("browser:console", entry);
      });
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

  // GET /api/browser/proxy/* — proxy requests to the project's dev server
  server.get<{ Params: { "*": string }; Querystring: { projectId: string } }>(
    "/api/browser/proxy/*",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["projectId"],
          properties: {
            projectId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.query;
      const runner = getRunnerForProject(projectId);

      if (!runner) {
        reply.code(502);
        return { error: "Dev server is not running" };
      }

      const status = runner.getStatus();
      if (!status.running || !status.port) {
        reply.code(502);
        return { error: "Dev server is not running" };
      }

      const proxyPath = request.params["*"] || "";
      const targetUrl = `http://127.0.0.1:${status.port}/${proxyPath}`;

      // Add CORS headers for the Insomniac frontend origin
      reply.header("Access-Control-Allow-Origin", "http://localhost:5173");
      reply.header("Access-Control-Allow-Methods", "GET, OPTIONS");
      reply.header("Access-Control-Allow-Headers", "Content-Type");

      return new Promise<void>((resolve) => {
        const proxyReq = httpRequest(targetUrl, (proxyRes) => {
          reply.code(proxyRes.statusCode ?? 200);

          // Forward content-type and other relevant headers from the dev server
          const contentType = proxyRes.headers["content-type"];
          if (contentType) reply.header("Content-Type", contentType);
          const contentLength = proxyRes.headers["content-length"];
          if (contentLength) reply.header("Content-Length", contentLength);
          const cacheControl = proxyRes.headers["cache-control"];
          if (cacheControl) reply.header("Cache-Control", cacheControl);

          reply.send(proxyRes);
          resolve();
        });

        proxyReq.on("error", () => {
          reply.code(502);
          reply.send({ error: "Dev server is not reachable" });
          resolve();
        });

        proxyReq.end();
      });
    },
  );
}
