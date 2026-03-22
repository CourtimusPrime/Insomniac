import { platform } from "node:os";
import { access, constants } from "node:fs/promises";
import { getDeploymentConfig } from "./deployment.js";

const isLinux = platform() === "linux";

async function hasKVM(): Promise<boolean> {
  try {
    await access("/dev/kvm", constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that the current platform supports the configured sandbox mode.
 * Call at server startup before registering routes.
 *
 * - firecracker on non-Linux: throws (server refuses to start)
 * - firecracker on Linux without KVM: logs warning
 * - all other configs: no-op
 */
export async function validatePlatformForSandbox(): Promise<void> {
  const config = getDeploymentConfig();

  if (config.sandboxing !== "firecracker") return;

  if (!isLinux) {
    throw new Error(
      "Firecracker sandboxing requires Linux with KVM. On Windows, agents run as local processes. Remove the sandbox config or switch to hosted mode."
    );
  }

  const kvmAvailable = await hasKVM();
  if (!kvmAvailable) {
    console.warn(
      "[platform-check] WARNING: Firecracker sandboxing is configured but /dev/kvm was not found. Firecracker may not work without KVM support."
    );
  }
}
