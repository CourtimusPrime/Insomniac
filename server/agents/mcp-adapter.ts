import { type ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type {
  AgentAdapter,
  AgentConfig,
  AgentMessage,
  AgentStatus,
} from './types.js';

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

type JsonRpcNotification = {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
};

type PendingRpc = {
  resolve: (value: JsonRpcResponse) => void;
  reject: (reason: Error) => void;
};

/**
 * Communicates with an AI agent via the MCP protocol (JSON-RPC 2.0 over stdin/stdout).
 * Spawns `claude --mcp-server` or a custom command and speaks MCP to it.
 */
export class McpAdapter implements AgentAdapter {
  status: AgentStatus = 'idle';

  private process: ChildProcess | null = null;
  private config: AgentConfig;
  private buffer = '';
  private nextRequestId = 1;
  private pendingRpcs = new Map<number, PendingRpc>();
  private pendingMessages: AgentMessage[] = [];
  private messageResolvers: Array<(msg: AgentMessage) => void> = [];
  private initialized = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async sendMessage(prompt: string): Promise<void> {
    await this.ensureConnection();
    this.status = 'working';

    // Send the prompt as an MCP tools/call request
    try {
      const response = await this.rpcCall('tools/call', {
        name: 'send_message',
        arguments: { prompt },
      });

      const agentMsg: AgentMessage = {
        id: randomUUID(),
        type: 'tool_result',
        payload: response.result,
      };
      this.enqueueMessage(agentMsg);
      this.status = 'idle';
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.enqueueMessage({
        id: randomUUID(),
        type: 'message',
        payload: { error: errorMsg },
      });
      this.status = 'error';
    }
  }

  async getResponse(): Promise<AgentMessage> {
    const buffered = this.pendingMessages.shift();
    if (buffered) {
      return buffered;
    }

    return new Promise<AgentMessage>((resolve) => {
      this.messageResolvers.push(resolve);
    });
  }

  async abort(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
      this.initialized = false;
      this.status = 'idle';

      // Reject all pending RPC calls
      for (const [, pending] of this.pendingRpcs) {
        pending.reject(new Error('aborted'));
      }
      this.pendingRpcs.clear();

      this.drainResolvers({
        id: randomUUID(),
        type: 'message',
        payload: { error: 'aborted' },
      });
    }
  }

  // --- MCP protocol helpers ---

  private async ensureConnection(): Promise<void> {
    if (this.process && this.initialized) return;

    this.spawnProcess();
    await this.handshake();
  }

  private spawnProcess(): void {
    if (this.process) return;

    this.process = spawn('claude', ['--mcp-server'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    this.process.stdout?.on('data', (chunk: Buffer) => {
      this.handleStdout(chunk.toString());
    });

    this.process.stderr?.on('data', (chunk: Buffer) => {
      console.error(
        `[McpAdapter][${this.config.name}] stderr: ${chunk.toString()}`,
      );
    });

    this.process.on('error', (err) => {
      console.error(`[McpAdapter][${this.config.name}] process error:`, err);
      this.status = 'error';
      this.rejectAllPending(err);
      this.drainResolvers({
        id: randomUUID(),
        type: 'message',
        payload: { error: err.message },
      });
    });

    this.process.on('exit', (code, signal) => {
      console.log(
        `[McpAdapter][${this.config.name}] process exited: code=${code} signal=${signal}`,
      );
      this.process = null;
      this.initialized = false;
      this.rejectAllPending(new Error(`process exited with code ${code}`));

      if (this.status === 'working') {
        this.status = 'disconnected';
        this.attemptReconnect();
      } else {
        this.status = 'idle';
      }
    });
  }

  private async handshake(): Promise<void> {
    // MCP initialize request
    const initResponse = await this.rpcCall('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'insomniac', version: '0.1.0' },
    });

    if (initResponse.error) {
      throw new Error(`MCP initialize failed: ${initResponse.error.message}`);
    }

    // Send initialized notification
    this.rpcNotify('notifications/initialized');
    this.initialized = true;
    this.reconnectAttempts = 0;
  }

  private rpcCall(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<JsonRpcResponse> {
    const id = this.nextRequestId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      ...(params !== undefined ? { params } : {}),
    };

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      this.pendingRpcs.set(id, { resolve, reject });
      this.writeJson(request);
    });
  }

  private rpcNotify(method: string, params?: Record<string, unknown>): void {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      ...(params !== undefined ? { params } : {}),
    };
    this.writeJson(notification);
  }

  private writeJson(msg: JsonRpcRequest | JsonRpcNotification): void {
    if (!this.process?.stdin?.writable) {
      throw new Error('stdin is not writable');
    }
    this.process.stdin.write(`${JSON.stringify(msg)}\n`);
  }

  // --- stdout handling ---

  private handleStdout(data: string): void {
    this.buffer += data;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed) as
          | JsonRpcResponse
          | JsonRpcNotification;
        this.handleJsonRpc(parsed);
      } catch {
        // Non-JSON output — log and ignore
        console.warn(
          `[McpAdapter][${this.config.name}] non-JSON stdout: ${trimmed}`,
        );
      }
    }
  }

  private handleJsonRpc(msg: JsonRpcResponse | JsonRpcNotification): void {
    // If it has an id, it's a response to one of our requests
    if ('id' in msg && msg.id != null) {
      const pending = this.pendingRpcs.get(msg.id);
      if (pending) {
        this.pendingRpcs.delete(msg.id);
        if (msg.error) {
          pending.reject(new Error(msg.error.message));
        } else {
          pending.resolve(msg as JsonRpcResponse);
        }
      }
      return;
    }

    // Server-initiated notification — map to AgentMessage
    const notification = msg as JsonRpcNotification;
    this.enqueueMessage({
      id: randomUUID(),
      type: 'message',
      payload: { method: notification.method, params: notification.params },
    });
  }

  // --- reconnection ---

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[McpAdapter][${this.config.name}] max reconnect attempts reached`,
      );
      this.status = 'disconnected';
      this.drainResolvers({
        id: randomUUID(),
        type: 'message',
        payload: { error: 'max reconnect attempts reached' },
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 8000);
    console.log(
      `[McpAdapter][${this.config.name}] reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(() => {
      this.ensureConnection().catch((err) => {
        console.error(
          `[McpAdapter][${this.config.name}] reconnect failed:`,
          err,
        );
        this.attemptReconnect();
      });
    }, delay);
  }

  // --- message queue ---

  private enqueueMessage(msg: AgentMessage): void {
    const resolver = this.messageResolvers.shift();
    if (resolver) {
      resolver(msg);
    } else {
      this.pendingMessages.push(msg);
    }
  }

  private drainResolvers(msg: AgentMessage): void {
    while (this.messageResolvers.length > 0) {
      const resolver = this.messageResolvers.shift();
      resolver?.(msg);
    }
  }

  private rejectAllPending(err: Error): void {
    for (const [, pending] of this.pendingRpcs) {
      pending.reject(err);
    }
    this.pendingRpcs.clear();
  }
}
