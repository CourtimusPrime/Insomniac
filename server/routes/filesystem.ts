import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { projects } from '../db/schema/index.js';
import { executeFilesystemTool } from '../filesystem/index.js';
import { isWSL } from '../utils/wsl.js';

export async function filesystemRoutes(server: FastifyInstance): Promise<void> {
  // Helper to resolve project root from projectId
  function getProjectRoot(projectId: string): string | null {
    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();
    return project?.path ?? null;
  }

  // POST /api/filesystem/read
  server.post<{ Body: { projectId: string; path: string } }>(
    '/api/filesystem/read',
    {
      schema: {
        body: {
          type: 'object',
          required: ['projectId', 'path'],
          properties: {
            projectId: { type: 'string', minLength: 1 },
            path: { type: 'string', minLength: 1 },
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
      return executeFilesystemTool(root, 'fs_read_file', {
        path: request.body.path,
      });
    },
  );

  // POST /api/filesystem/write
  server.post<{ Body: { projectId: string; path: string; content: string } }>(
    '/api/filesystem/write',
    {
      schema: {
        body: {
          type: 'object',
          required: ['projectId', 'path', 'content'],
          properties: {
            projectId: { type: 'string', minLength: 1 },
            path: { type: 'string', minLength: 1 },
            content: { type: 'string' },
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
      return executeFilesystemTool(root, 'fs_write_file', {
        path: request.body.path,
        content: request.body.content,
      });
    },
  );

  // POST /api/filesystem/list
  server.post<{ Body: { projectId: string; path: string } }>(
    '/api/filesystem/list',
    {
      schema: {
        body: {
          type: 'object',
          required: ['projectId', 'path'],
          properties: {
            projectId: { type: 'string', minLength: 1 },
            path: { type: 'string' },
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
      return executeFilesystemTool(root, 'fs_list_directory', {
        path: request.body.path,
      });
    },
  );

  // POST /api/filesystem/delete
  server.post<{ Body: { projectId: string; path: string } }>(
    '/api/filesystem/delete',
    {
      schema: {
        body: {
          type: 'object',
          required: ['projectId', 'path'],
          properties: {
            projectId: { type: 'string', minLength: 1 },
            path: { type: 'string', minLength: 1 },
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
      return executeFilesystemTool(root, 'fs_delete_file', {
        path: request.body.path,
      });
    },
  );

  // POST /api/filesystem/mkdir
  server.post<{ Body: { projectId: string; path: string } }>(
    '/api/filesystem/mkdir',
    {
      schema: {
        body: {
          type: 'object',
          required: ['projectId', 'path'],
          properties: {
            projectId: { type: 'string', minLength: 1 },
            path: { type: 'string', minLength: 1 },
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
      return executeFilesystemTool(root, 'fs_mkdir', {
        path: request.body.path,
      });
    },
  );

  // POST /api/filesystem/stat
  server.post<{ Body: { projectId: string; path: string } }>(
    '/api/filesystem/stat',
    {
      schema: {
        body: {
          type: 'object',
          required: ['projectId', 'path'],
          properties: {
            projectId: { type: 'string', minLength: 1 },
            path: { type: 'string', minLength: 1 },
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
      return executeFilesystemTool(root, 'fs_stat', {
        path: request.body.path,
      });
    },
  );

  // GET /api/filesystem/browse/info — report home dir and whether WSL is available
  server.get('/api/filesystem/browse/info', async () => {
    const home = homedir();
    const wsl = isWSL();
    const wslDrives: string[] = [];

    if (wsl) {
      try {
        const mntEntries = await readdir('/mnt', { withFileTypes: true });
        for (const entry of mntEntries) {
          if (entry.isDirectory() && /^[a-z]$/.test(entry.name)) {
            wslDrives.push(entry.name);
          }
        }
      } catch {
        // /mnt not accessible
      }
    }

    return { home, wsl, wslDrives };
  });

  // POST /api/filesystem/browse — list directories at a path
  server.post<{ Body: { path: string } }>(
    '/api/filesystem/browse',
    {
      schema: {
        body: {
          type: 'object',
          required: ['path'],
          properties: {
            path: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const resolved = resolve(request.body.path);
      const entries: { name: string; path: string; type: 'dir' }[] = [];

      try {
        const dirEntries = await readdir(resolved, { withFileTypes: true });
        for (const entry of dirEntries) {
          if (entry.name.startsWith('.')) continue;
          if (entry.isDirectory()) {
            entries.push({
              name: entry.name,
              path: resolve(resolved, entry.name),
              type: 'dir',
            });
          }
        }
        entries.sort((a, b) => a.name.localeCompare(b.name));
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
          reply.code(404);
          return { error: 'Directory not found' };
        }
        if (code === 'EACCES' || code === 'EPERM') {
          reply.code(403);
          return { error: 'Permission denied' };
        }
        reply.code(500);
        return { error: 'Failed to read directory' };
      }

      // Detect project markers (parallel for WSL /mnt/ perf)
      const markers = [
        'package.json',
        'Cargo.toml',
        'go.mod',
        'pyproject.toml',
        'requirements.txt',
        'pom.xml',
        'build.gradle',
        '.git',
      ];
      const results = await Promise.allSettled(
        markers.map((m) => stat(resolve(resolved, m))),
      );
      const isProject = results.some((r) => r.status === 'fulfilled');

      return {
        path: resolved,
        name: basename(resolved),
        entries,
        isProject,
      };
    },
  );

  // GET /api/filesystem/status
  server.get('/api/filesystem/status', async () => {
    return { enabled: true };
  });
}
