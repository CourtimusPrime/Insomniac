import { type ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type {
  AgentAdapter,
  AgentConfig,
  AgentMessage,
  AgentStatus,
} from './types.js';

/**
 * Communicates with Claude Code via a child process using JSON lines over stdin/stdout.
 */
export class StdioAdapter implements AgentAdapter {
  status: AgentStatus = 'idle';

  private process: ChildProcess | null = null;
  private config: AgentConfig;
  private buffer = '';
  private pendingMessages: AgentMessage[] = [];
  private messageResolvers: Array<(msg: AgentMessage) => void> = [];

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async sendMessage(prompt: string): Promise<void> {
    this.ensureProcess();

    const message: AgentMessage = {
      id: randomUUID(),
      type: 'message',
      payload: { prompt },
    };

    this.status = 'working';
    this.writeJson(message);
  }

  async getResponse(): Promise<AgentMessage> {
    // If we already have a buffered message, return it immediately
    const buffered = this.pendingMessages.shift();
    if (buffered) {
      return buffered;
    }

    // If the process is already dead, reject immediately
    if (!this.process && this.status !== 'working') {
      return {
        id: randomUUID(),
        type: 'message',
        payload: { error: 'process not running' },
      };
    }

    // Otherwise wait for the next message from stdout
    return new Promise<AgentMessage>((resolve) => {
      this.messageResolvers.push(resolve);
    });
  }

  async abort(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
      this.status = 'idle';
      this.drainResolvers({
        id: randomUUID(),
        type: 'message',
        payload: { error: 'aborted' },
      });
    }
  }

  // --- internal helpers ---

  private ensureProcess(): void {
    if (this.process) return;

    this.process = spawn('claude', ['--dangerously-skip-permissions'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    this.process.stdout?.on('data', (chunk: Buffer) => {
      this.handleStdout(chunk.toString());
    });

    this.process.stderr?.on('data', (chunk: Buffer) => {
      console.error(
        `[StdioAdapter][${this.config.name}] stderr: ${chunk.toString()}`,
      );
    });

    this.process.on('error', (err) => {
      console.error(`[StdioAdapter][${this.config.name}] process error:`, err);
      this.status = 'error';
      this.drainResolvers({
        id: randomUUID(),
        type: 'message',
        payload: { error: err.message },
      });
    });

    this.process.on('exit', (code, signal) => {
      console.log(
        `[StdioAdapter][${this.config.name}] process exited: code=${code} signal=${signal}`,
      );
      this.process = null;
      if (this.status === 'working') {
        this.status = 'disconnected';
        this.drainResolvers({
          id: randomUUID(),
          type: 'message',
          payload: { error: `process exited with code ${code}` },
        });
      } else {
        this.status = 'idle';
      }
    });
  }

  private writeJson(msg: AgentMessage): void {
    if (!this.process?.stdin?.writable) {
      throw new Error('stdin is not writable');
    }
    this.process.stdin.write(`${JSON.stringify(msg)}\n`);
  }

  private handleStdout(data: string): void {
    this.buffer += data;
    const lines = this.buffer.split('\n');
    // Keep the last (possibly incomplete) line in the buffer
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed) as AgentMessage;
        this.enqueueMessage(parsed);
      } catch {
        // Non-JSON output — treat as a plain text message
        this.enqueueMessage({
          id: randomUUID(),
          type: 'message',
          payload: { text: trimmed },
        });
      }
    }
  }

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
}
