import { spawn } from 'node:child_process';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { settings } from '../db/schema/index.js';
import { McpAdapter } from './mcp-adapter.js';
import { StdioAdapter } from './stdio-adapter.js';
import type { AgentAdapter, AgentConfig } from './types.js';

const TRANSPORT_SETTING_KEY = 'claude_code.transport';
const MCP_PROBE_TIMEOUT_MS = 2000;

type Transport = AgentConfig['transport'];

/**
 * Reads the transport preference from the settings table.
 * Falls back to 'auto' if no setting is found.
 */
export function getTransportSetting(workspaceId: string): Transport {
  const row = db
    .select()
    .from(settings)
    .where(
      and(
        eq(settings.workspaceId, workspaceId),
        eq(settings.key, TRANSPORT_SETTING_KEY),
      ),
    )
    .get();

  const value = row?.value as string | null;
  if (value === 'mcp' || value === 'stdio' || value === 'auto') {
    return value;
  }
  return 'auto';
}

/**
 * Creates the appropriate AgentAdapter based on the config transport setting.
 *
 * - 'stdio' → StdioAdapter
 * - 'mcp'   → McpAdapter
 * - 'auto'  → tries MCP first, falls back to stdio on failure
 */
export async function createAgent(config: AgentConfig): Promise<AgentAdapter> {
  switch (config.transport) {
    case 'stdio':
      return new StdioAdapter(config);
    case 'mcp':
      return new McpAdapter(config);
    case 'auto':
      return autoDetect(config);
  }
}

/**
 * Probes whether the MCP transport is available by spawning a short-lived
 * `claude --mcp-server` process. If the process starts successfully,
 * returns an McpAdapter; otherwise falls back to StdioAdapter.
 */
async function autoDetect(config: AgentConfig): Promise<AgentAdapter> {
  const mcpAvailable = await probeMcpSupport();
  if (mcpAvailable) {
    return new McpAdapter(config);
  }
  console.log(
    `[AgentFactory] MCP unavailable for "${config.name}", falling back to stdio`,
  );
  return new StdioAdapter(config);
}

/**
 * Spawns a short-lived `claude --mcp-server` process to check whether
 * MCP transport is available. Resolves true if the process starts without
 * immediately erroring or exiting with a non-zero code.
 */
function probeMcpSupport(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const proc = spawn('claude', ['--mcp-server'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let settled = false;
      const settle = (result: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        proc.kill('SIGTERM');
        resolve(result);
      };

      // If the process stays alive for the timeout, MCP is likely available
      const timer = setTimeout(() => settle(true), MCP_PROBE_TIMEOUT_MS);

      proc.on('error', () => settle(false));

      proc.on('exit', (code) => {
        // Immediate exit with non-zero = MCP not supported
        if (code !== null && code !== 0) {
          settle(false);
        }
        // Exit with code 0 is fine (clean shutdown)
      });
    } catch {
      resolve(false);
    }
  });
}
