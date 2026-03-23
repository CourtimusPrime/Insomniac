import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { projects } from '../db/schema/index.js';
import { LocalhostRunner } from '../integrations/localhost-runner.js';
import { broadcast } from '../ws/handler.js';

/** Map of projectId → LocalhostRunner instance */
const runners = new Map<string, LocalhostRunner>();

function getOrCreateRunner(projectId: string): LocalhostRunner {
  let runner = runners.get(projectId);
  if (!runner) {
    runner = new LocalhostRunner();
    runners.set(projectId, runner);
  }
  return runner;
}

/**
 * Get the LocalhostRunner for a project (if one exists).
 * Used by the browser proxy route to discover the dev server port.
 */
export function getRunnerForProject(
  projectId: string,
): LocalhostRunner | undefined {
  return runners.get(projectId);
}

export async function localhostRoutes(server: FastifyInstance): Promise<void> {
  // POST /api/projects/:id/dev-server/start
  server.post<{ Params: { id: string } }>(
    '/api/projects/:id/dev-server/start',
    async (request, reply) => {
      const { id } = request.params;

      const project = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();

      if (!project) {
        reply.code(404);
        return { error: 'Project not found' };
      }

      if (!project.path) {
        reply.code(400);
        return { error: 'Project has no local path' };
      }

      const runner = getOrCreateRunner(id);

      // Wire up log streaming via WebSocket
      runner.onLog((line) => {
        broadcast('devserver:log', { projectId: id, line });
      });

      const result = await runner.start(project.path);

      if (!result.success) {
        reply.code(400);
        return { error: result.error };
      }

      return { success: true, port: result.port };
    },
  );

  // POST /api/projects/:id/dev-server/stop
  server.post<{ Params: { id: string } }>(
    '/api/projects/:id/dev-server/stop',
    async (request, reply) => {
      const { id } = request.params;

      const project = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();

      if (!project) {
        reply.code(404);
        return { error: 'Project not found' };
      }

      const runner = runners.get(id);
      if (!runner) {
        reply.code(400);
        return { error: 'No dev server is running' };
      }

      const result = runner.stop();

      if (!result.success) {
        reply.code(400);
        return { error: result.error };
      }

      return { success: true };
    },
  );

  // GET /api/projects/:id/dev-server/status
  server.get<{ Params: { id: string } }>(
    '/api/projects/:id/dev-server/status',
    async (request, reply) => {
      const { id } = request.params;

      const project = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();

      if (!project) {
        reply.code(404);
        return { error: 'Project not found' };
      }

      const runner = runners.get(id);
      if (!runner) {
        return { running: false, port: null, pid: null };
      }

      return runner.getStatus();
    },
  );
}
