import { spawn } from 'node:child_process';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { settings } from '../db/schema/index.js';
import { validatePath } from '../filesystem/filesystem-tools.js';
import { getOrCreateDefaultWorkspace } from '../utils/workspace.js';
import { isWSL } from '../utils/wsl.js';
import { broadcast } from '../ws/handler.js';

// ---------------------------------------------------------------------------
// MCP-compatible tool definition types
// ---------------------------------------------------------------------------

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, { type: string; description: string }>;
  required: string[];
}

export interface ShellToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

export interface ShellToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ---------------------------------------------------------------------------
// Tool definitions (MCP-compatible schemas)
// ---------------------------------------------------------------------------

export const shellToolDefinitions: ShellToolDefinition[] = [
  {
    name: 'shell_exec_bash',
    description: 'Execute a bash command in the project workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The bash command to execute.',
        },
        cwd: {
          type: 'string',
          description: 'Working directory relative to project root (optional).',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default 30000, max 300000).',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'shell_exec_powershell',
    description:
      'Execute a PowerShell command (available on WSL via Windows interop).',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The PowerShell command to execute.',
        },
        cwd: {
          type: 'string',
          description: 'Working directory relative to project root (optional).',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default 30000, max 300000).',
        },
      },
      required: ['command'],
    },
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT = 30_000;
const MAX_TIMEOUT = 300_000;
const MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

async function getShellSetting(key: string): Promise<boolean> {
  const workspaceId = await getOrCreateDefaultWorkspace();
  const row = db
    .select()
    .from(settings)
    .where(and(eq(settings.workspaceId, workspaceId), eq(settings.key, key)))
    .get();

  if (!row) return true; // enabled by default
  return row.value === true || row.value === 'true';
}

// ---------------------------------------------------------------------------
// Shell execution
// ---------------------------------------------------------------------------

function execCommand(
  cmd: string,
  args: string[],
  options: { cwd: string; timeout: number },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      cwd: options.cwd,
      timeout: options.timeout,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      if (stdout.length < MAX_OUTPUT_BYTES) {
        stdout += data.toString();
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      if (stderr.length < MAX_OUTPUT_BYTES) {
        stderr += data.toString();
      }
    });

    proc.on('close', (code) => {
      // Truncate if exceeded buffer
      if (stdout.length > MAX_OUTPUT_BYTES) {
        stdout =
          stdout.slice(0, MAX_OUTPUT_BYTES) +
          '\n... (output truncated at 64KB)';
      }
      if (stderr.length > MAX_OUTPUT_BYTES) {
        stderr =
          stderr.slice(0, MAX_OUTPUT_BYTES) +
          '\n... (output truncated at 64KB)';
      }
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });

    proc.on('error', (err) => {
      resolve({ stdout, stderr: err.message, exitCode: 1 });
    });
  });
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

type ToolArgs = Record<string, unknown>;

const toolHandlers: Record<
  string,
  (projectRoot: string, args: ToolArgs) => Promise<ShellToolResult>
> = {
  async shell_exec_bash(projectRoot, args) {
    const enabled = await getShellSetting('shell.bash.enabled');
    if (!enabled) {
      return {
        success: false,
        error: 'Bash execution is disabled in settings',
      };
    }

    const command = args.command as string;
    const timeout = Math.min(
      Number(args.timeout ?? DEFAULT_TIMEOUT),
      MAX_TIMEOUT,
    );

    let cwd = projectRoot;
    if (args.cwd) {
      cwd = validatePath(args.cwd as string, projectRoot);
    }

    const result = await execCommand('sh', ['-c', command], { cwd, timeout });
    return {
      success: result.exitCode === 0,
      data: result,
      error:
        result.exitCode !== 0
          ? result.stderr || `Exited with code ${result.exitCode}`
          : undefined,
    };
  },

  async shell_exec_powershell(projectRoot, args) {
    if (!isWSL()) {
      return {
        success: false,
        error: 'PowerShell is only available in WSL environments',
      };
    }

    const enabled = await getShellSetting('shell.powershell.enabled');
    if (!enabled) {
      return {
        success: false,
        error: 'PowerShell execution is disabled in settings',
      };
    }

    const command = args.command as string;
    const timeout = Math.min(
      Number(args.timeout ?? DEFAULT_TIMEOUT),
      MAX_TIMEOUT,
    );

    let cwd = projectRoot;
    if (args.cwd) {
      cwd = validatePath(args.cwd as string, projectRoot);
    }

    const result = await execCommand(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', command],
      { cwd, timeout },
    );
    return {
      success: result.exitCode === 0,
      data: result,
      error:
        result.exitCode !== 0
          ? result.stderr || `Exited with code ${result.exitCode}`
          : undefined,
    };
  },
};

// ---------------------------------------------------------------------------
// Agent action broadcasting
// ---------------------------------------------------------------------------

let actionCounter = 0;

function describeAction(toolName: string, args: ToolArgs): string {
  const command = String(args.command ?? '');
  const preview = command.length > 60 ? command.slice(0, 57) + '...' : command;
  switch (toolName) {
    case 'shell_exec_bash':
      return `bash: ${preview}`;
    case 'shell_exec_powershell':
      return `powershell: ${preview}`;
    default:
      return toolName;
  }
}

/**
 * Execute a shell tool by name scoped to the given project root.
 * Broadcasts 'shell:agent-action' WebSocket events for each action.
 */
export async function executeShellTool(
  projectRoot: string,
  toolName: string,
  args: ToolArgs,
): Promise<ShellToolResult> {
  const handler = toolHandlers[toolName];
  if (!handler) {
    return { success: false, error: `Unknown shell tool: ${toolName}` };
  }

  const actionId = `shell-action-${++actionCounter}`;
  const description = describeAction(toolName, args);
  const timestamp = new Date().toISOString();

  broadcast('shell:agent-action', {
    id: actionId,
    action: description,
    status: 'pending',
    timestamp,
  });

  try {
    const result = await handler(projectRoot, args);
    broadcast('shell:agent-action', {
      id: actionId,
      action: description,
      status: result.success ? 'done' : 'error',
      timestamp,
      error: result.error,
    });
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    broadcast('shell:agent-action', {
      id: actionId,
      action: description,
      status: 'error',
      timestamp,
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}

// ---------------------------------------------------------------------------
// 'shell' Ability record
// ---------------------------------------------------------------------------

export const shellAbility = {
  name: 'shell',
  type: 'plugin' as const,
  config: {
    description:
      'Shell execution tools for running bash and PowerShell commands.',
    tools: shellToolDefinitions.map((t) => t.name),
    toolDefinitions: shellToolDefinitions,
  },
  version: '1.0.0',
} satisfies {
  name: string;
  type: 'skill' | 'plugin' | 'mcp';
  config: Record<string, unknown>;
  version: string;
};
