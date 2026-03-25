import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { abilitiesV2 } from '../db/schema/index.js';
import type { AbilityDocument } from './types.js';
import { WorkflowEngine } from './workflow-engine.js';

export interface ExecutionContext {
  workspaceId: string;
  input: Record<string, unknown>;
  callStack: string[]; // for circular reference detection
  onEvent?: (event: ExecutionEvent) => void;
}

export interface ExecutionEvent {
  type: 'step:start' | 'step:complete' | 'step:error' | 'gate' | 'log';
  stepId?: string;
  data?: unknown;
}

/**
 * Execute an ability by ID, dispatching to the appropriate executor.
 */
export async function executeAbility(
  abilityId: string,
  input: Record<string, unknown>,
  context: ExecutionContext,
): Promise<Record<string, unknown>> {
  // Circular reference detection
  if (context.callStack.includes(abilityId)) {
    throw new Error(
      `Circular workflow reference detected: ${[...context.callStack, abilityId].join(' -> ')}`,
    );
  }

  // Load ability from DB
  const row = db
    .select()
    .from(abilitiesV2)
    .where(eq(abilitiesV2.id, abilityId))
    .get();

  if (!row) {
    throw new Error(`Ability not found: ${abilityId}`);
  }

  const doc = row.document as unknown as AbilityDocument;
  if (!doc) {
    throw new Error(`Ability ${abilityId} has no document`);
  }

  const childContext: ExecutionContext = {
    ...context,
    callStack: [...context.callStack, abilityId],
  };

  const { executor } = doc.config.runtime;

  switch (executor) {
    case 'skill':
      return executeSkill(doc, input, childContext);

    case 'command':
      return executeCommand(doc, input);

    case 'mcp':
      return executeMcp(doc, input);

    case 'workflow':
      return executeWorkflow(doc, input, childContext);

    default:
      throw new Error(`Unknown executor type: ${executor}`);
  }
}

/**
 * Execute a skill (LLM) ability.
 * TODO: Wire to provider system for actual LLM calls.
 */
async function executeSkill(
  doc: AbilityDocument,
  input: Record<string, unknown>,
  _context: ExecutionContext,
): Promise<Record<string, unknown>> {
  // For now, return a placeholder. In production, this would:
  // 1. Construct prompt from doc.instructions + input
  // 2. Call LLM via the provider system
  // 3. Parse response into output format
  return {
    _executor: 'skill',
    _abilityId: doc.frontmatter.id,
    _input: input,
    _instructions:
      typeof doc.instructions === 'string'
        ? doc.instructions.slice(0, 100)
        : '[workflow steps]',
    result: `[Skill execution placeholder for ${doc.frontmatter.name}]`,
  };
}

/**
 * Execute a command ability by spawning a child process.
 */
async function executeCommand(
  doc: AbilityDocument,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { spawn } = await import('node:child_process');

  const runtime = doc.config.runtime;
  if (runtime.executor !== 'command') {
    throw new Error('Expected command executor');
  }

  // Substitute env vars from input
  const env: Record<string, string | undefined> = {
    ...process.env,
    ...(runtime.env ?? {}),
  };

  // Add input fields as env vars
  for (const [key, value] of Object.entries(input)) {
    env[key.toUpperCase()] = String(value);
  }

  const entrypoint = runtime.entrypoint;
  const cwd = runtime.working_directory ?? process.cwd();

  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', entrypoint], {
      cwd,
      env,
      timeout: (doc.config.timeout_seconds ?? 60) * 1000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const parseOutput = runtime.parse_output ?? 'text';
      let result: unknown;

      if (parseOutput === 'json') {
        try {
          result = JSON.parse(stdout);
        } catch {
          result = stdout;
        }
      } else if (parseOutput === 'lines') {
        result = stdout.split('\n').filter(Boolean);
      } else {
        result = stdout;
      }

      resolve({
        exit_code: code ?? 0,
        stdout: result,
        stderr,
      });
    });

    child.on('error', (err) => {
      reject(new Error(`Shell execution failed: ${err.message}`));
    });
  });
}

/**
 * Execute an MCP ability.
 * TODO: Wire to McpConnectionManager.
 */
async function executeMcp(
  doc: AbilityDocument,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // Placeholder — in production this would use McpConnectionManager
  return {
    _executor: 'mcp',
    _abilityId: doc.frontmatter.id,
    _input: input,
    result: `[MCP execution placeholder for ${doc.frontmatter.name}]`,
  };
}

/**
 * Execute a workflow ability by delegating to the WorkflowEngine.
 */
async function executeWorkflow(
  doc: AbilityDocument,
  input: Record<string, unknown>,
  context: ExecutionContext,
): Promise<Record<string, unknown>> {
  if (!Array.isArray(doc.instructions)) {
    throw new Error(
      `Workflow ability ${doc.frontmatter.id} has non-array instructions`,
    );
  }

  const engine = new WorkflowEngine(doc.instructions, context);
  return engine.run(input);
}
