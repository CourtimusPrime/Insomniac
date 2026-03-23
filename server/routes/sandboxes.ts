import type { FastifyInstance } from 'fastify';
import { getDeploymentConfig } from '../config/deployment.js';
import { type SandboxConfig, SandboxManager } from '../hosted/index.js';

// Shared sandbox manager instance (non-strict Linux requirement for prototype)
const manager = new SandboxManager(false);

type CreateSandboxBody = {
  maxMemoryMB?: number;
  maxVCPUs?: number;
  networkMode?: 'none' | 'nat' | 'bridged';
  rootfsPath?: string;
  kernelPath?: string;
};

export async function sandboxRoutes(server: FastifyInstance): Promise<void> {
  const config = getDeploymentConfig();

  // Only register sandbox routes in hosted mode
  if (config.mode !== 'hosted') return;

  // GET /api/sandboxes — list active sandboxes
  server.get('/api/sandboxes', async () => {
    const sandboxes = manager.listSandboxes();
    return { sandboxes };
  });

  // POST /api/sandboxes — create a new sandbox
  server.post<{ Body: CreateSandboxBody }>(
    '/api/sandboxes',
    async (request, reply) => {
      const body = (request.body ?? {}) as CreateSandboxBody;

      // Input validation
      if (body.maxMemoryMB !== undefined) {
        if (
          typeof body.maxMemoryMB !== 'number' ||
          body.maxMemoryMB < 128 ||
          body.maxMemoryMB > 4096
        ) {
          reply.code(400).send({
            error: 'maxMemoryMB must be a number between 128 and 4096',
          });
          return;
        }
      }

      if (body.maxVCPUs !== undefined) {
        if (
          typeof body.maxVCPUs !== 'number' ||
          body.maxVCPUs < 1 ||
          body.maxVCPUs > 8
        ) {
          reply
            .code(400)
            .send({ error: 'maxVCPUs must be a number between 1 and 8' });
          return;
        }
      }

      if (body.networkMode !== undefined) {
        if (!['none', 'nat', 'bridged'].includes(body.networkMode)) {
          reply
            .code(400)
            .send({ error: 'networkMode must be one of: none, nat, bridged' });
          return;
        }
      }

      const overrides: Partial<SandboxConfig> = {};
      if (body.maxMemoryMB !== undefined)
        overrides.maxMemoryMB = body.maxMemoryMB;
      if (body.maxVCPUs !== undefined) overrides.maxVCPUs = body.maxVCPUs;
      if (body.networkMode !== undefined)
        overrides.networkMode = body.networkMode;
      if (body.rootfsPath !== undefined) overrides.rootfsPath = body.rootfsPath;
      if (body.kernelPath !== undefined) overrides.kernelPath = body.kernelPath;

      const id = manager.createSandbox(overrides);
      reply.code(201).send({ id });
    },
  );

  // DELETE /api/sandboxes/:id — destroy a sandbox
  server.delete<{ Params: { id: string } }>(
    '/api/sandboxes/:id',
    async (request, reply) => {
      const { id } = request.params;
      const destroyed = manager.destroySandbox(id);

      if (!destroyed) {
        reply.code(404).send({ error: 'Sandbox not found' });
        return;
      }

      return { ok: true };
    },
  );

  // GET /api/sandboxes/:id/status — get sandbox status
  server.get<{ Params: { id: string } }>(
    '/api/sandboxes/:id/status',
    async (request, reply) => {
      const { id } = request.params;
      const sandbox = manager.getSandbox(id);

      if (!sandbox) {
        reply.code(404).send({ error: 'Sandbox not found' });
        return;
      }

      return { id, status: sandbox.status, config: sandbox.config.vmConfig };
    },
  );
}
