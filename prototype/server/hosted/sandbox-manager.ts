import { randomUUID } from "node:crypto";
import { platform } from "node:os";
import {
  type SandboxConfig,
  type SandboxInstance,
  type SandboxStatus,
  defaultSandboxConfig,
} from "./firecracker-types.js";

const isLinux = platform() === "linux";

export class SandboxManager {
  private sandboxes = new Map<string, SandboxInstance>();

  constructor(private requireLinux: boolean = true) {
    if (this.requireLinux && !isLinux) {
      throw new Error(
        "Firecracker sandboxing requires Linux with KVM. Current platform: " +
          platform()
      );
    }
  }

  createSandbox(config?: Partial<SandboxConfig>): string {
    const id = randomUUID();
    const mergedConfig: SandboxConfig = { ...defaultSandboxConfig, ...config };

    if (!isLinux) {
      console.warn(
        `[SandboxManager] Platform is ${platform()}, not Linux — returning mock sandbox ${id}`
      );
    }

    const instance: SandboxInstance = {
      vmConfig: {
        ...mergedConfig,
        instanceId: id,
        workspaceId: `ws-${id.slice(0, 8)}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
      status: "running",
      createdAt: new Date(),
    };

    this.sandboxes.set(id, instance);
    return id;
  }

  destroySandbox(id: string): boolean {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) return false;

    if (!isLinux) {
      console.warn(
        `[SandboxManager] Platform is ${platform()}, not Linux — mock destroying sandbox ${id}`
      );
    }

    sandbox.status = "stopped";
    this.sandboxes.delete(id);
    return true;
  }

  getSandbox(id: string): { status: SandboxStatus; config: SandboxInstance } | null {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) return null;
    return { status: sandbox.status, config: sandbox };
  }

  listSandboxes(): SandboxInstance[] {
    return Array.from(this.sandboxes.values()).filter(
      (s) => s.status !== "stopped"
    );
  }
}
