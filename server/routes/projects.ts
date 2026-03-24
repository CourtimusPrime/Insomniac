import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { projects, settings } from '../db/schema/index.js';
import { GitHubService } from '../integrations/github.js';
import { getVSCodeCommand } from '../utils/index.js';
import { getOrCreateDefaultWorkspace } from '../utils/workspace.js';

/** Default clone directory — user's home directory */
const DEFAULT_PROJECTS_DIR = resolve(homedir());

/**
 * Gets the configured projects directory from settings, falling back to home dir.
 */
function getProjectsDir(workspaceId: string): string {
  const row = db
    .select()
    .from(settings)
    .where(
      and(
        eq(settings.workspaceId, workspaceId),
        eq(settings.key, 'projects.cloneDir'),
      ),
    )
    .get();

  if (row?.value && typeof row.value === 'string') {
    return row.value;
  }

  return DEFAULT_PROJECTS_DIR;
}

const SEED_PROJECTS = [
  { name: 'Aether-OS', language: 'Rust', status: 'building' as const },
  { name: 'Nova-Protocol', language: 'TypeScript', status: 'idle' as const },
  { name: 'Lumina-API', language: 'Python', status: 'error' as const },
  { name: 'Void-Shell', language: 'Go', status: 'completed' as const },
];

async function seedIfEmpty(workspaceId: string) {
  const count = db.select().from(projects).all();
  if (count.length > 0) return;

  for (const seed of SEED_PROJECTS) {
    db.insert(projects)
      .values({
        workspaceId,
        name: seed.name,
        language: seed.language,
        status: seed.status,
      })
      .run();
  }
}

export async function projectRoutes(server: FastifyInstance) {
  // Ensure default workspace and seed data on plugin load
  const workspaceId = await getOrCreateDefaultWorkspace();
  await seedIfEmpty(workspaceId);

  // GET /api/projects — list all projects for default workspace
  server.get('/api/projects', async () => {
    return db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .all();
  });

  // POST /api/projects — create a new project
  server.post<{
    Body: { name: string; language?: string; repoUrl?: string; path?: string };
  }>(
    '/api/projects',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            language: { type: 'string', maxLength: 50 },
            repoUrl: { type: 'string', format: 'uri', maxLength: 500 },
            path: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, language, repoUrl, path } = request.body;
      const id = crypto.randomUUID();

      db.insert(projects)
        .values({ id, workspaceId, name, language, repoUrl, path })
        .run();

      const created = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();

      reply.code(201);
      return created;
    },
  );

  // POST /api/projects/clone — create a project by cloning a GitHub repo
  server.post<{ Body: { repoUrl: string; name?: string } }>(
    '/api/projects/clone',
    {
      schema: {
        body: {
          type: 'object',
          required: ['repoUrl'],
          additionalProperties: false,
          properties: {
            repoUrl: { type: 'string', minLength: 1, maxLength: 500 },
            name: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const { repoUrl, name } = request.body;

      // Derive project name from URL if not provided
      const repoName = (
        name ||
        repoUrl
          .replace(/\.git$/, '')
          .split('/')
          .pop()
          ?.replace(/[^a-zA-Z0-9_-]/g, '') ||
        'project'
      ).replace(/^\.+/, ''); // Strip leading dots to prevent path traversal

      if (!repoName || repoName === '.' || repoName === '..') {
        reply.code(400);
        return { error: 'Invalid project name' };
      }

      const projectsDir = getProjectsDir(workspaceId);
      const targetPath = resolve(projectsDir, repoName);
      // Security: verify resolved path is inside the configured projects dir
      if (!targetPath.startsWith(`${projectsDir}/`)) {
        reply.code(400);
        return { error: 'Invalid project path' };
      }

      // Ensure projects directory exists
      await mkdir(projectsDir, { recursive: true });

      const github = new GitHubService();
      const result = await github.cloneRepo(repoUrl, targetPath);

      if (!result.success) {
        reply.code(400);
        return { error: result.error };
      }

      // Create a project record in the database
      const id = crypto.randomUUID();
      db.insert(projects)
        .values({
          id,
          workspaceId,
          name: repoName,
          repoUrl,
          path: targetPath,
        })
        .run();

      const created = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();

      reply.code(201);
      return created;
    },
  );

  // POST /api/projects/:id/open-vscode — open project in VS Code
  server.post<{ Params: { id: string } }>(
    '/api/projects/:id/open-vscode',
    async (request, reply) => {
      const { id } = request.params;

      const project = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();

      if (!project) {
        reply.code(404);
        return { success: false, error: 'Project not found' };
      }

      if (!project.path) {
        reply.code(400);
        return { success: false, error: 'Project has no local path' };
      }

      const command = getVSCodeCommand();

      try {
        const child = spawn(command, [project.path], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to open VS Code';
        reply.code(500);
        return { success: false, error: message };
      }
    },
  );

  // GET /api/projects/:id/chain — get chain definition
  server.get<{ Params: { id: string } }>(
    '/api/projects/:id/chain',
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

      return project.chainDefinition ?? { version: 1, nodes: [], edges: [] };
    },
  );

  // PUT /api/projects/:id/chain — save chain definition
  server.put<{
    Params: { id: string };
    Body: { version: number; nodes: unknown[]; edges: unknown[] };
  }>(
    '/api/projects/:id/chain',
    {
      schema: {
        body: {
          type: 'object',
          required: ['version', 'nodes', 'edges'],
          additionalProperties: false,
          properties: {
            version: { type: 'number' },
            nodes: { type: 'array' },
            edges: { type: 'array' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const existing = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();

      if (!existing) {
        reply.code(404);
        return { error: 'Project not found' };
      }

      db.update(projects)
        .set({ chainDefinition: request.body, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .run();

      const updated = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();
      return updated?.chainDefinition ?? request.body;
    },
  );

  // PUT /api/projects/:id — update a project
  server.put<{
    Params: { id: string };
    Body: Partial<{
      name: string;
      status: 'idle' | 'building' | 'completed' | 'error';
      language: string;
      repoUrl: string;
      path: string;
    }>;
  }>(
    '/api/projects/:id',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            status: {
              type: 'string',
              enum: ['idle', 'building', 'completed', 'error'],
            },
            language: { type: 'string', maxLength: 50 },
            repoUrl: { type: 'string', format: 'uri', maxLength: 500 },
            path: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const existing = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();

      if (!existing) {
        reply.code(404);
        return { error: 'Project not found' };
      }

      const { name, status, language, repoUrl, path } = request.body;
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (status !== undefined) updates.status = status;
      if (language !== undefined) updates.language = language;
      if (repoUrl !== undefined) updates.repoUrl = repoUrl;
      if (path !== undefined) updates.path = path;

      db.update(projects)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .run();

      return db.select().from(projects).where(eq(projects.id, id)).get();
    },
  );

  // DELETE /api/projects/:id — delete a project
  server.delete<{ Params: { id: string } }>(
    '/api/projects/:id',
    async (request, reply) => {
      const { id } = request.params;

      const existing = db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .get();

      if (!existing) {
        reply.code(404);
        return { error: 'Project not found' };
      }

      db.delete(projects).where(eq(projects.id, id)).run();
      return reply.code(204).send();
    },
  );

  // GET /api/projects/config/clone-dir — get the current clone directory
  server.get('/api/projects/config/clone-dir', async () => {
    return {
      cloneDir: getProjectsDir(workspaceId),
      default: DEFAULT_PROJECTS_DIR,
    };
  });

  // PUT /api/projects/config/clone-dir — set the clone directory
  server.put<{ Body: { cloneDir: string } }>(
    '/api/projects/config/clone-dir',
    {
      schema: {
        body: {
          type: 'object',
          required: ['cloneDir'],
          properties: {
            cloneDir: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request) => {
      const { cloneDir } = request.body;
      const resolvedDir = resolve(cloneDir);

      // Ensure directory exists
      await mkdir(resolvedDir, { recursive: true });

      // Upsert the setting
      const existing = db
        .select()
        .from(settings)
        .where(
          and(
            eq(settings.workspaceId, workspaceId),
            eq(settings.key, 'projects.cloneDir'),
          ),
        )
        .get();

      if (existing) {
        db.update(settings)
          .set({ value: resolvedDir })
          .where(eq(settings.id, existing.id))
          .run();
      } else {
        db.insert(settings)
          .values({
            workspaceId,
            key: 'projects.cloneDir',
            value: resolvedDir,
            category: 'projects',
          })
          .run();
      }

      return { cloneDir: resolvedDir };
    },
  );
}
