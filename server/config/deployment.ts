export type DeploymentMode = "local" | "remote" | "hosted";

export type FileAccessMode = "filesystem" | "github";
export type SandboxMode = "none" | "firecracker";
export type AuthMode = "none" | "basic" | "oauth";

export type DeploymentConfig = {
  mode: DeploymentMode;
  fileAccess: FileAccessMode;
  sandboxing: SandboxMode;
  auth: AuthMode;
};

const configs: Record<DeploymentMode, Omit<DeploymentConfig, "mode">> = {
  local: { fileAccess: "filesystem", sandboxing: "none", auth: "none" },
  remote: { fileAccess: "filesystem", sandboxing: "none", auth: "basic" },
  hosted: { fileAccess: "github", sandboxing: "firecracker", auth: "oauth" },
};

export function detectDeploymentMode(): DeploymentMode {
  const env = process.env.INSOMNIAC_MODE;
  if (env === "remote" || env === "hosted") return env;
  return "local";
}

export function getDeploymentConfig(): DeploymentConfig {
  const mode = detectDeploymentMode();
  return { mode, ...configs[mode] };
}
