import { and, eq, like } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  type ExecutionContext,
  executeAbility,
} from '../abilities/executor.js';
import { convertLegacy, detectFormat } from '../abilities/legacy-import.js';
import { parseAbilityYaml, serializeAbilityYaml } from '../abilities/parser.js';
import { AbilityRegistry } from '../abilities/registry.js';
import { validateAbility } from '../abilities/schema.js';
import { type AbilityDocument, resolveKind } from '../abilities/types.js';
import { WorkflowEngine } from '../abilities/workflow-engine.js';
import { db } from '../db/connection.js';
import { abilitiesV2 } from '../db/schema/index.js';
import { getOrCreateDefaultWorkspace } from '../utils/workspace.js';

export async function abilityRoutes(server: FastifyInstance) {
  const workspaceId = await getOrCreateDefaultWorkspace();
  const registry = new AbilityRegistry();

  // ─── GET /api/abilities ── list with filters ───
  server.get<{
    Querystring: {
      executor?: string;
      tags?: string;
      enabled?: string;
      search?: string;
    };
  }>('/api/abilities', async (request) => {
    const { executor, tags, enabled, search } = request.query;
    const conditions = [eq(abilitiesV2.workspaceId, workspaceId)];

    if (executor) {
      conditions.push(
        eq(
          abilitiesV2.executor,
          executor as 'skill' | 'command' | 'mcp' | 'workflow',
        ),
      );
    }
    if (enabled !== undefined) {
      conditions.push(eq(abilitiesV2.enabled, enabled === 'true'));
    }
    if (search) {
      conditions.push(like(abilitiesV2.name, `%${search}%`));
    }

    let rows = db
      .select()
      .from(abilitiesV2)
      .where(and(...conditions))
      .all();

    // Filter by tags (JSON array in SQLite — filter in JS)
    if (tags) {
      const filterTags = tags.split(',').map((t) => t.trim());
      rows = rows.filter((row) => {
        const rowTags = row.tags as string[];
        return filterTags.some((t) => rowTags.includes(t));
      });
    }

    // Add computed `kind` field
    return rows.map((row) => {
      const doc = row.document as unknown as AbilityDocument | null;
      return {
        ...row,
        kind: doc ? resolveKind(doc) : row.executor,
      };
    });
  });

  // ─── GET /api/abilities/:id ── full document ───
  server.get<{ Params: { id: string } }>(
    '/api/abilities/:id',
    async (request, reply) => {
      const row = db
        .select()
        .from(abilitiesV2)
        .where(eq(abilitiesV2.id, request.params.id))
        .get();

      if (!row) {
        reply.code(404);
        return { error: 'Ability not found' };
      }

      const doc = row.document as unknown as AbilityDocument | null;
      return {
        ...row,
        kind: doc ? resolveKind(doc) : row.executor,
      };
    },
  );

  // ─── POST /api/abilities ── create from JSON body ───
  server.post<{
    Body: {
      frontmatter: AbilityDocument['frontmatter'];
      trigger?: string;
      interface?: AbilityDocument['interface'];
      config: AbilityDocument['config'];
      instructions?: string | AbilityDocument['instructions'];
      examples?: string;
      dependencies?: string[];
    };
  }>('/api/abilities', async (request, reply) => {
    const body = request.body;
    const doc: AbilityDocument = {
      frontmatter: body.frontmatter,
      trigger: body.trigger ?? '',
      interface: body.interface ?? { input: [], output: [] },
      config: body.config,
      instructions: body.instructions ?? '',
      examples: body.examples ?? '',
      dependencies: body.dependencies ?? [],
    };

    const validation = validateAbility(doc);
    if (!validation.valid) {
      reply.code(400);
      return { error: 'Invalid ability', details: validation.errors };
    }

    // Write to disk
    registry.writeAbility(doc);
    // Sync to DB
    registry.syncToDb(workspaceId);

    const created = db
      .select()
      .from(abilitiesV2)
      .where(eq(abilitiesV2.id, doc.frontmatter.id))
      .get();

    reply.code(201);
    return created;
  });

  // ─── PUT /api/abilities/:id ── partial update ───
  server.put<{
    Params: { id: string };
    Body: Partial<AbilityDocument>;
  }>('/api/abilities/:id', async (request, reply) => {
    const { id } = request.params;

    const existing = db
      .select()
      .from(abilitiesV2)
      .where(eq(abilitiesV2.id, id))
      .get();

    if (!existing) {
      reply.code(404);
      return { error: 'Ability not found' };
    }

    const currentDoc = existing.document as unknown as AbilityDocument;
    const updates = request.body;

    // Merge updates into current doc
    const merged: AbilityDocument = {
      ...currentDoc,
      ...updates,
      frontmatter: {
        ...currentDoc.frontmatter,
        ...(updates.frontmatter ?? {}),
      },
      config: {
        ...currentDoc.config,
        ...(updates.config ?? {}),
        runtime: {
          ...currentDoc.config.runtime,
          ...(updates.config?.runtime ?? {}),
        },
      },
      interface: updates.interface ?? currentDoc.interface,
    };

    // Write merged doc to disk + sync
    registry.writeAbility(merged);
    registry.syncToDb(workspaceId);

    return db.select().from(abilitiesV2).where(eq(abilitiesV2.id, id)).get();
  });

  // ─── DELETE /api/abilities/:id ───
  server.delete<{ Params: { id: string } }>(
    '/api/abilities/:id',
    async (request, reply) => {
      const { id } = request.params;

      const existing = db
        .select()
        .from(abilitiesV2)
        .where(eq(abilitiesV2.id, id))
        .get();

      if (!existing) {
        reply.code(404);
        return { error: 'Ability not found' };
      }

      // Delete from disk + DB
      registry.deleteAbility(existing.filePath);
      db.delete(abilitiesV2).where(eq(abilitiesV2.id, id)).run();

      return reply.code(204).send();
    },
  );

  // ─── POST /api/abilities/import ── auto-detect format ───
  server.post<{ Body: string }>(
    '/api/abilities/import',
    {
      schema: {
        body: { type: 'string', maxLength: 100000 },
      },
    },
    async (request, reply) => {
      const raw = request.body;

      const format = detectFormat(raw);

      let doc: AbilityDocument;
      try {
        if (format === 'ability-yaml') {
          doc = parseAbilityYaml(raw);
        } else {
          doc = convertLegacy(raw, format);
        }
      } catch (e) {
        reply.code(400);
        return {
          error: `Failed to import (detected format: ${format}): ${(e as Error).message}`,
        };
      }

      registry.writeAbility(doc);
      registry.syncToDb(workspaceId);

      const created = db
        .select()
        .from(abilitiesV2)
        .where(eq(abilitiesV2.id, doc.frontmatter.id))
        .get();

      reply.code(201);
      return { ...created, detectedFormat: format };
    },
  );

  // ─── PATCH /api/abilities/:id/toggle ── enable/disable ───
  server.patch<{ Params: { id: string } }>(
    '/api/abilities/:id/toggle',
    async (request, reply) => {
      const { id } = request.params;

      const existing = db
        .select()
        .from(abilitiesV2)
        .where(eq(abilitiesV2.id, id))
        .get();

      if (!existing) {
        reply.code(404);
        return { error: 'Ability not found' };
      }

      const doc = existing.document as unknown as AbilityDocument;
      doc.frontmatter.enabled = !existing.enabled;

      // Write updated YAML + sync
      registry.writeAbility(doc);
      registry.syncToDb(workspaceId);

      return db.select().from(abilitiesV2).where(eq(abilitiesV2.id, id)).get();
    },
  );

  // ─── GET /api/abilities/:id/yaml ── raw YAML ───
  server.get<{ Params: { id: string } }>(
    '/api/abilities/:id/yaml',
    async (request, reply) => {
      const { id } = request.params;

      const existing = db
        .select()
        .from(abilitiesV2)
        .where(eq(abilitiesV2.id, id))
        .get();

      if (!existing) {
        reply.code(404);
        return { error: 'Ability not found' };
      }

      const doc = existing.document as unknown as AbilityDocument;
      const yaml = serializeAbilityYaml(doc);

      reply.header('Content-Type', 'text/yaml');
      return yaml;
    },
  );

  // ─── PUT /api/abilities/:id/yaml ── accept raw YAML ───
  server.put<{
    Params: { id: string };
    Body: string;
  }>(
    '/api/abilities/:id/yaml',
    {
      schema: {
        body: { type: 'string', maxLength: 100000 },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Validate the YAML
      let doc: AbilityDocument;
      try {
        doc = parseAbilityYaml(request.body);
      } catch (e) {
        reply.code(400);
        return { error: (e as Error).message };
      }

      // Ensure ID matches
      if (doc.frontmatter.id !== id) {
        reply.code(400);
        return {
          error: `YAML id "${doc.frontmatter.id}" does not match route id "${id}"`,
        };
      }

      // Write to disk + sync
      registry.writeAbility(doc);
      registry.syncToDb(workspaceId);

      return db.select().from(abilitiesV2).where(eq(abilitiesV2.id, id)).get();
    },
  );

  // ─── Execution endpoints ───

  // Store running workflow engines by execution ID
  const runningWorkflows = new Map<string, WorkflowEngine>();

  // POST /api/abilities/:id/execute — start execution
  server.post<{
    Params: { id: string };
    Body: { input?: Record<string, unknown> };
  }>('/api/abilities/:id/execute', async (request, reply) => {
    const { id } = request.params;
    const input = request.body.input ?? {};

    const row = db
      .select()
      .from(abilitiesV2)
      .where(eq(abilitiesV2.id, id))
      .get();

    if (!row) {
      reply.code(404);
      return { error: 'Ability not found' };
    }

    const execId = crypto.randomUUID();
    const doc = row.document as unknown as AbilityDocument;

    const context: ExecutionContext = {
      workspaceId,
      input,
      callStack: [],
      onEvent: (event) => {
        // TODO: Broadcast via WebSocket
        server.log.info({ execId, event }, 'workflow event');
      },
    };

    // For workflow abilities, store the engine for pause/resume/cancel
    if (
      doc.config.runtime.executor === 'workflow' &&
      Array.isArray(doc.instructions)
    ) {
      const engine = new WorkflowEngine(doc.instructions, context);
      runningWorkflows.set(execId, engine);

      // Run async — don't await
      engine.run(input).then(
        (result) => {
          runningWorkflows.delete(execId);
          server.log.info({ execId, result }, 'workflow completed');
        },
        (error) => {
          runningWorkflows.delete(execId);
          server.log.error(
            { execId, error: (error as Error).message },
            'workflow failed',
          );
        },
      );

      return { executionId: execId, status: 'running' };
    }

    // Non-workflow abilities — execute immediately
    try {
      const result = await executeAbility(id, input, context);
      return { executionId: execId, status: 'completed', result };
    } catch (error) {
      reply.code(500);
      return {
        executionId: execId,
        status: 'error',
        error: (error as Error).message,
      };
    }
  });

  // POST /api/abilities/:id/executions/:execId/pause
  server.post<{
    Params: { id: string; execId: string };
  }>('/api/abilities/:id/executions/:execId/pause', async (request, reply) => {
    const engine = runningWorkflows.get(request.params.execId);
    if (!engine) {
      reply.code(404);
      return { error: 'Execution not found' };
    }
    engine.pause();
    return { status: engine.getStatus() };
  });

  // POST /api/abilities/:id/executions/:execId/resume
  server.post<{
    Params: { id: string; execId: string };
  }>('/api/abilities/:id/executions/:execId/resume', async (request, reply) => {
    const engine = runningWorkflows.get(request.params.execId);
    if (!engine) {
      reply.code(404);
      return { error: 'Execution not found' };
    }
    engine.resume();
    return { status: engine.getStatus() };
  });

  // POST /api/abilities/:id/executions/:execId/cancel
  server.post<{
    Params: { id: string; execId: string };
  }>('/api/abilities/:id/executions/:execId/cancel', async (request, reply) => {
    const engine = runningWorkflows.get(request.params.execId);
    if (!engine) {
      reply.code(404);
      return { error: 'Execution not found' };
    }
    engine.cancel();
    runningWorkflows.delete(request.params.execId);
    return { status: 'cancelled' };
  });

  // POST /api/abilities/:id/gates/:stepId/approve
  server.post<{
    Params: { id: string; stepId: string };
    Querystring: { execId: string };
  }>('/api/abilities/:id/gates/:stepId/approve', async (request, reply) => {
    const engine = runningWorkflows.get(request.query.execId);
    if (!engine) {
      reply.code(404);
      return { error: 'Execution not found' };
    }
    engine.approveGate(request.params.stepId);
    return { status: 'approved' };
  });

  // POST /api/abilities/:id/gates/:stepId/reject
  server.post<{
    Params: { id: string; stepId: string };
    Querystring: { execId: string };
  }>('/api/abilities/:id/gates/:stepId/reject', async (request, reply) => {
    const engine = runningWorkflows.get(request.query.execId);
    if (!engine) {
      reply.code(404);
      return { error: 'Execution not found' };
    }
    engine.rejectGate(request.params.stepId);
    return { status: 'rejected' };
  });
}
