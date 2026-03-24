import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { projects } from '../db/schema/index.js';
import { validatePath } from '../filesystem/index.js';
import { executeShellTool } from '../shell/index.js';
import { isWSL } from '../utils/wsl.js';

export async function shellRoutes(server: FastifyInstance): Promise<void> {
  function getProjectRoot(projectId: string): string | null {
    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();
    return project?.path ?? null;
  }

  // POST /api/shell/bash
  server.post<{
    Body: {
      projectId: string;
      command: string;
      cwd?: string;
      timeout?: number;
    };
  }>(
    '/api/shell/bash',
    {
      schema: {
        body: {
          type: 'object',
          required: ['projectId', 'command'],
          properties: {
            projectId: { type: 'string', minLength: 1 },
            command: { type: 'string', minLength: 1 },
            cwd: { type: 'string' },
            timeout: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const root = getProjectRoot(request.body.projectId);
      if (!root) {
        reply.code(404);
        return { error: 'Project not found or has no path configured' };
      }
      return executeShellTool(root, 'shell_exec_bash', {
        command: request.body.command,
        cwd: request.body.cwd,
        timeout: request.body.timeout,
      });
    },
  );

  // POST /api/shell/powershell
  server.post<{
    Body: {
      projectId: string;
      command: string;
      cwd?: string;
      timeout?: number;
    };
  }>(
    '/api/shell/powershell',
    {
      schema: {
        body: {
          type: 'object',
          required: ['projectId', 'command'],
          properties: {
            projectId: { type: 'string', minLength: 1 },
            command: { type: 'string', minLength: 1 },
            cwd: { type: 'string' },
            timeout: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const root = getProjectRoot(request.body.projectId);
      if (!root) {
        reply.code(404);
        return { error: 'Project not found or has no path configured' };
      }
      return executeShellTool(root, 'shell_exec_powershell', {
        command: request.body.command,
        cwd: request.body.cwd,
        timeout: request.body.timeout,
      });
    },
  );

  // GET /api/shell/status
  server.get('/api/shell/status', async () => {
    return {
      bashEnabled: true,
      powershellEnabled: isWSL(),
      isWSL: isWSL(),
    };
  });
}
