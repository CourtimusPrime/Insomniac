import {
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { isWSL, resolveWSLPath } from '../utils/wsl.js';
import { broadcast } from '../ws/handler.js';

// ---------------------------------------------------------------------------
// MCP-compatible tool definition types
// ---------------------------------------------------------------------------

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, { type: string; description: string }>;
  required: string[];
}

export interface FilesystemToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

export interface FilesystemToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ---------------------------------------------------------------------------
// Tool definitions (MCP-compatible schemas)
// ---------------------------------------------------------------------------

export const filesystemToolDefinitions: FilesystemToolDefinition[] = [
  {
    name: 'fs_read_file',
    description: 'Read the contents of a file at the given path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file to read.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'fs_write_file',
    description:
      'Write content to a file at the given path, creating directories as needed.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file to write.',
        },
        content: {
          type: 'string',
          description: 'The content to write to the file.',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'fs_list_directory',
    description: 'List files and directories at the given path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the directory to list.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'fs_delete_file',
    description: 'Delete a file at the given path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file to delete.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'fs_mkdir',
    description:
      'Create a directory (and parent directories) at the given path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the directory to create.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'fs_stat',
    description:
      'Get file or directory metadata (size, type, modification time).',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to stat.' },
      },
      required: ['path'],
    },
  },
];

// ---------------------------------------------------------------------------
// Path validation
// ---------------------------------------------------------------------------

/**
 * Validates and resolves a requested path against the project root.
 * Prevents directory traversal attacks.
 * Handles WSL path conversion for Windows-style paths.
 */
export function validatePath(
  requestedPath: string,
  projectRoot: string,
): string {
  let normalizedPath = requestedPath;

  // Convert Windows paths to WSL paths if running in WSL
  if (isWSL() && /^[A-Za-z]:[/\\]/.test(normalizedPath)) {
    normalizedPath = resolveWSLPath(normalizedPath);
  }

  const resolved = resolve(projectRoot, normalizedPath);

  if (!resolved.startsWith(projectRoot)) {
    throw new Error(
      `Path traversal blocked: "${requestedPath}" resolves outside project root`,
    );
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

type ToolArgs = Record<string, unknown>;

const toolHandlers: Record<
  string,
  (projectRoot: string, args: ToolArgs) => Promise<FilesystemToolResult>
> = {
  async fs_read_file(projectRoot, args) {
    const fullPath = validatePath(args.path as string, projectRoot);
    const content = await readFile(fullPath, 'utf-8');
    return { success: true, data: { path: args.path, content } };
  },

  async fs_write_file(projectRoot, args) {
    const fullPath = validatePath(args.path as string, projectRoot);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, args.content as string, 'utf-8');
    return { success: true, data: { path: args.path } };
  },

  async fs_list_directory(projectRoot, args) {
    const fullPath = validatePath(args.path as string, projectRoot);
    const entries = await readdir(fullPath, { withFileTypes: true });
    const items = entries.map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? ('dir' as const) : ('file' as const),
    }));
    return { success: true, data: { path: args.path, entries: items } };
  },

  async fs_delete_file(projectRoot, args) {
    const fullPath = validatePath(args.path as string, projectRoot);
    await unlink(fullPath);
    return { success: true, data: { path: args.path } };
  },

  async fs_mkdir(projectRoot, args) {
    const fullPath = validatePath(args.path as string, projectRoot);
    await mkdir(fullPath, { recursive: true });
    return { success: true, data: { path: args.path } };
  },

  async fs_stat(projectRoot, args) {
    const fullPath = validatePath(args.path as string, projectRoot);
    const stats = await stat(fullPath);
    return {
      success: true,
      data: {
        path: args.path,
        size: stats.size,
        type: stats.isDirectory() ? 'dir' : 'file',
        mtime: stats.mtime.toISOString(),
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Agent action broadcasting
// ---------------------------------------------------------------------------

let actionCounter = 0;

function describeAction(toolName: string, args: ToolArgs): string {
  switch (toolName) {
    case 'fs_read_file':
      return `reading ${args.path}`;
    case 'fs_write_file':
      return `writing ${args.path}`;
    case 'fs_list_directory':
      return `listing ${args.path}`;
    case 'fs_delete_file':
      return `deleting ${args.path}`;
    case 'fs_mkdir':
      return `creating directory ${args.path}`;
    case 'fs_stat':
      return `stat ${args.path}`;
    default:
      return toolName;
  }
}

/**
 * Execute a filesystem tool by name scoped to the given project root.
 * Broadcasts 'filesystem:agent-action' WebSocket events for each action.
 */
export async function executeFilesystemTool(
  projectRoot: string,
  toolName: string,
  args: ToolArgs,
): Promise<FilesystemToolResult> {
  const handler = toolHandlers[toolName];
  if (!handler) {
    return { success: false, error: `Unknown filesystem tool: ${toolName}` };
  }

  const actionId = `fs-action-${++actionCounter}`;
  const description = describeAction(toolName, args);
  const timestamp = new Date().toISOString();

  broadcast('filesystem:agent-action', {
    id: actionId,
    action: description,
    status: 'pending',
    timestamp,
  });

  try {
    const result = await handler(projectRoot, args);
    broadcast('filesystem:agent-action', {
      id: actionId,
      action: description,
      status: result.success ? 'done' : 'error',
      timestamp,
      error: result.error,
    });
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    broadcast('filesystem:agent-action', {
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
// 'filesystem' Ability record
// ---------------------------------------------------------------------------

export const filesystemAbility = {
  name: 'filesystem',
  type: 'plugin' as const,
  config: {
    description:
      'Filesystem tools for reading, writing, and managing project files.',
    tools: filesystemToolDefinitions.map((t) => t.name),
    toolDefinitions: filesystemToolDefinitions,
  },
  version: '1.0.0',
} satisfies {
  name: string;
  type: 'skill' | 'plugin' | 'mcp';
  config: Record<string, unknown>;
  version: string;
};
