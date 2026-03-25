import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import {
  abilities,
  abilitiesV2,
  agents,
  pipelineStages,
  pipelines,
  stageAbilities,
} from '../db/schema/index.js';
import { AbilityRegistry } from './registry.js';
import type { AbilityDocument, WorkflowStep } from './types.js';

interface MigrationResult {
  abilitiesMigrated: number;
  agentsMigrated: number;
  pipelinesMigrated: number;
  skipped: number;
  errors: Array<{ source: string; error: string }>;
}

/**
 * Migrate legacy abilities, agents, and pipelines to the unified Ability YAML format.
 * Idempotent: skips entries where the slug already exists.
 */
export function migrateToAbilitiesV2(workspaceId: string): MigrationResult {
  const registry = new AbilityRegistry();
  const result: MigrationResult = {
    abilitiesMigrated: 0,
    agentsMigrated: 0,
    pipelinesMigrated: 0,
    skipped: 0,
    errors: [],
  };

  // ── Migrate abilities table ──
  const oldAbilities = db.select().from(abilities).all();

  for (const old of oldAbilities) {
    try {
      const id = slugify(old.name);

      // Check if already exists
      const existing = db
        .select()
        .from(abilitiesV2)
        .where(eq(abilitiesV2.id, id))
        .get();

      if (existing) {
        result.skipped++;
        continue;
      }

      const config = (old.config as Record<string, unknown>) ?? {};

      const doc: AbilityDocument = {
        frontmatter: {
          id,
          name: old.name,
          version: old.version ?? '1.0.0',
          description: (config.description as string) ?? '',
          tags: ['migrated', old.type],
          author: '',
          enabled: old.active,
        },
        trigger: (config.trigger as string) ?? '',
        interface: { input: [], output: [] },
        config: {
          runtime:
            old.type === 'mcp'
              ? { executor: 'mcp' as const, transport: 'stdio' as const }
              : { executor: 'skill' as const },
        },
        instructions: (config.content as string) ?? '',
        examples: '',
        dependencies: [],
      };

      registry.writeAbility(doc);
      result.abilitiesMigrated++;
    } catch (e) {
      result.errors.push({
        source: `ability:${old.id}`,
        error: (e as Error).message,
      });
    }
  }

  // ── Migrate agents table ──
  const oldAgents = db.select().from(agents).all();

  for (const agent of oldAgents) {
    try {
      const id = slugify(agent.name);

      const existing = db
        .select()
        .from(abilitiesV2)
        .where(eq(abilitiesV2.id, id))
        .get();

      if (existing) {
        result.skipped++;
        continue;
      }

      const doc: AbilityDocument = {
        frontmatter: {
          id,
          name: agent.name,
          version: '1.0.0',
          description: agent.role ?? '',
          tags: ['migrated', 'agent'],
          author: '',
          enabled: true,
        },
        trigger: '',
        interface: { input: [], output: [] },
        config: {
          runtime: {
            executor: 'skill' as const,
            ...(agent.model ? { model: agent.model } : {}),
          },
          memory: 'session' as const,
        },
        instructions: agent.systemPrompt ?? '',
        examples: '',
        dependencies: [],
      };

      registry.writeAbility(doc);
      result.agentsMigrated++;
    } catch (e) {
      result.errors.push({
        source: `agent:${agent.id}`,
        error: (e as Error).message,
      });
    }
  }

  // ── Migrate pipelines to workflow abilities ──
  const oldPipelines = db.select().from(pipelines).all();

  for (const pipeline of oldPipelines) {
    try {
      const id = slugify(pipeline.name);

      const existing = db
        .select()
        .from(abilitiesV2)
        .where(eq(abilitiesV2.id, id))
        .get();

      if (existing) {
        result.skipped++;
        continue;
      }

      // Get stages ordered by sortOrder
      const stages = db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.pipelineId, pipeline.id))
        .all()
        .sort((a, b) => a.sortOrder - b.sortOrder);

      // Build workflow steps
      const steps: WorkflowStep[] = stages.map((stage) => {
        // Get abilities assigned to this stage
        const assigned = db
          .select()
          .from(stageAbilities)
          .where(eq(stageAbilities.stageId, stage.id))
          .all();

        const firstAbilityId =
          assigned.length > 0 ? assigned[0].abilityId : undefined;

        // Look up ability name for the use field
        let useRef: string | undefined;
        if (firstAbilityId) {
          const abilityRow = db
            .select()
            .from(abilities)
            .where(eq(abilities.id, firstAbilityId))
            .get();
          if (abilityRow) {
            useRef = slugify(abilityRow.name);
          }
        }

        return {
          id: slugify(stage.name),
          ...(useRef ? { use: useRef } : {}),
          label: stage.name,
          output: `${slugify(stage.name)}_result`,
        };
      });

      const doc: AbilityDocument = {
        frontmatter: {
          id,
          name: pipeline.name,
          version: '1.0.0',
          description: `Migrated pipeline: ${pipeline.name}`,
          tags: ['migrated', 'workflow'],
          author: '',
          enabled: true,
        },
        trigger: '',
        interface: { input: [], output: [] },
        config: {
          runtime: { executor: 'workflow' as const },
          on_error: 'stop' as const,
        },
        instructions: steps,
        examples: '',
        dependencies: steps.map((s) => s.use).filter((u): u is string => !!u),
      };

      registry.writeAbility(doc);
      result.pipelinesMigrated++;
    } catch (e) {
      result.errors.push({
        source: `pipeline:${pipeline.id}`,
        error: (e as Error).message,
      });
    }
  }

  // Sync all new files to DB
  registry.syncToDb(workspaceId);

  return result;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
