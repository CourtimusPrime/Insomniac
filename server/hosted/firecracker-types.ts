export type SandboxConfig = {
  maxMemoryMB: number;
  maxVCPUs: number;
  networkMode: 'none' | 'nat' | 'bridged';
  rootfsPath: string;
  kernelPath: string;
};

export type VMConfig = SandboxConfig & {
  instanceId: string;
  workspaceId: string;
  expiresAt: Date;
};

export type SandboxStatus = 'starting' | 'running' | 'stopping' | 'stopped';

export type SandboxInstance = {
  vmConfig: VMConfig;
  status: SandboxStatus;
  createdAt: Date;
};

export const defaultSandboxConfig: SandboxConfig = {
  maxMemoryMB: 512,
  maxVCPUs: 1,
  networkMode: 'nat',
  rootfsPath: '/var/lib/firecracker/rootfs.ext4',
  kernelPath: '/var/lib/firecracker/vmlinux',
};
