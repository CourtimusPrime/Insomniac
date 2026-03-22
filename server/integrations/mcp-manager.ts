import { spawn, type ChildProcess } from "node:child_process";

interface McpConnectionConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpConnectionStatus {
  name: string;
  command: string;
  args: string[];
  status: "connected" | "disconnected" | "restarting";
  pid: number | null;
  restartCount: number;
}

interface McpConnectionEntry {
  config: McpConnectionConfig;
  process: ChildProcess | null;
  status: "connected" | "disconnected" | "restarting";
  restartCount: number;
}

const MAX_RETRIES = 3;

export class McpConnectionManager {
  private connections: Map<string, McpConnectionEntry> = new Map();

  /**
   * Connect to an MCP server by spawning it as a child process.
   */
  connect(config: McpConnectionConfig): { success: boolean; error?: string } {
    if (this.connections.has(config.name)) {
      const existing = this.connections.get(config.name)!;
      if (existing.status === "connected") {
        return { success: false, error: `Connection "${config.name}" already exists` };
      }
    }

    const entry: McpConnectionEntry = {
      config,
      process: null,
      status: "disconnected",
      restartCount: 0,
    };

    this.connections.set(config.name, entry);
    return this.spawnProcess(config.name);
  }

  /**
   * Disconnect an MCP server by killing its process.
   */
  disconnect(name: string): { success: boolean; error?: string } {
    const entry = this.connections.get(name);
    if (!entry) {
      return { success: false, error: `Connection "${name}" not found` };
    }

    if (entry.process) {
      entry.process.removeAllListeners("close");
      entry.process.kill();
    }

    this.connections.delete(name);
    return { success: true };
  }

  /**
   * List all MCP connections with their current status.
   */
  listConnections(): McpConnectionStatus[] {
    const result: McpConnectionStatus[] = [];
    for (const entry of this.connections.values()) {
      result.push(this.toStatus(entry));
    }
    return result;
  }

  /**
   * Get a specific MCP connection by name.
   */
  getConnection(name: string): McpConnectionStatus | null {
    const entry = this.connections.get(name);
    if (!entry) return null;
    return this.toStatus(entry);
  }

  private toStatus(entry: McpConnectionEntry): McpConnectionStatus {
    return {
      name: entry.config.name,
      command: entry.config.command,
      args: entry.config.args ?? [],
      status: entry.status,
      pid: entry.process?.pid ?? null,
      restartCount: entry.restartCount,
    };
  }

  private spawnProcess(name: string): { success: boolean; error?: string } {
    const entry = this.connections.get(name);
    if (!entry) {
      return { success: false, error: `Connection "${name}" not found` };
    }

    try {
      const proc = spawn(entry.config.command, entry.config.args ?? [], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...entry.config.env },
      });

      entry.process = proc;
      entry.status = "connected";

      proc.on("close", (code) => {
        // Only auto-restart on unexpected exits (non-zero or signal kill)
        const current = this.connections.get(name);
        if (!current) return; // Already disconnected

        current.process = null;
        current.status = "disconnected";

        if (code !== 0 && current.restartCount < MAX_RETRIES) {
          current.restartCount++;
          current.status = "restarting";
          this.spawnProcess(name);
        }
      });

      proc.on("error", () => {
        const current = this.connections.get(name);
        if (!current) return;

        current.process = null;
        current.status = "disconnected";

        if (current.restartCount < MAX_RETRIES) {
          current.restartCount++;
          current.status = "restarting";
          this.spawnProcess(name);
        }
      });

      return { success: true };
    } catch (err) {
      entry.status = "disconnected";
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Failed to spawn MCP server: ${message}` };
    }
  }
}
