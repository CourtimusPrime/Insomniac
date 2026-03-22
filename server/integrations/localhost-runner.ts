import { spawn, type ChildProcess } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "node:net";

interface DevServerStatus {
  running: boolean;
  port: number | null;
  pid: number | null;
}

interface DetectResult {
  framework: string;
  script: string;
  defaultPort: number;
}

const FRAMEWORK_DEFAULTS: Record<string, { script: string; port: number }> = {
  next: { script: "dev", port: 3000 },
  vite: { script: "dev", port: 5173 },
  "react-scripts": { script: "start", port: 3000 },
  astro: { script: "dev", port: 4321 },
};

/**
 * Find an available port, starting from the preferred port.
 */
async function findAvailablePort(preferred: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(preferred, () => {
      server.close(() => resolve(preferred));
    });
    server.on("error", () => {
      // Port occupied — let OS pick one
      const fallback = createServer();
      fallback.listen(0, () => {
        const addr = fallback.address();
        const port = typeof addr === "object" && addr ? addr.port : 0;
        fallback.close(() => {
          if (port) resolve(port);
          else reject(new Error("Could not find an available port"));
        });
      });
      fallback.on("error", reject);
    });
  });
}

export class LocalhostRunner {
  private process: ChildProcess | null = null;
  private port: number | null = null;
  private logListeners: Array<(line: string) => void> = [];

  /**
   * Detect the dev server framework and script from a project's package.json.
   */
  async detectDevServer(projectPath: string): Promise<DetectResult | null> {
    let pkg: { scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    try {
      const raw = await readFile(join(projectPath, "package.json"), "utf-8");
      pkg = JSON.parse(raw);
    } catch {
      return null;
    }

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const scripts = pkg.scripts ?? {};

    for (const [framework, defaults] of Object.entries(FRAMEWORK_DEFAULTS)) {
      if (deps[framework]) {
        const script = scripts[defaults.script] ? defaults.script : Object.keys(scripts).find((s) => s === "dev" || s === "start") ?? defaults.script;
        return { framework, script, defaultPort: defaults.port };
      }
    }

    // Fallback: check for dev or start script
    if (scripts.dev) return { framework: "unknown", script: "dev", defaultPort: 3000 };
    if (scripts.start) return { framework: "unknown", script: "start", defaultPort: 3000 };

    return null;
  }

  /**
   * Start the dev server for the given project.
   */
  async start(projectPath: string): Promise<{ success: boolean; port?: number; error?: string }> {
    if (this.process) {
      return { success: false, error: "Dev server is already running" };
    }

    const detected = await this.detectDevServer(projectPath);
    if (!detected) {
      return { success: false, error: "No dev server detected in project" };
    }

    const port = await findAvailablePort(detected.defaultPort);

    const proc = spawn("npm", ["run", detected.script, "--", "--port", String(port)], {
      cwd: projectPath,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PORT: String(port) },
    });

    this.process = proc;
    this.port = port;

    const emitLog = (line: string) => {
      for (const listener of this.logListeners) listener(line);
    };

    proc.stdout?.on("data", (chunk: Buffer) => emitLog(chunk.toString()));
    proc.stderr?.on("data", (chunk: Buffer) => emitLog(chunk.toString()));

    proc.on("close", () => {
      this.process = null;
      this.port = null;
    });

    return { success: true, port };
  }

  /**
   * Stop the running dev server.
   */
  stop(): { success: boolean; error?: string } {
    if (!this.process) {
      return { success: false, error: "No dev server is running" };
    }
    this.process.kill();
    this.process = null;
    this.port = null;
    return { success: true };
  }

  /**
   * Get the current status of the dev server.
   */
  getStatus(): DevServerStatus {
    return {
      running: this.process !== null && !this.process.killed,
      port: this.port,
      pid: this.process?.pid ?? null,
    };
  }

  /**
   * Register a listener for dev server log output.
   */
  onLog(listener: (line: string) => void): () => void {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== listener);
    };
  }
}
