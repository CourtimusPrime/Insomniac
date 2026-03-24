import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface ShellStatus {
  bashEnabled: boolean;
  powershellEnabled: boolean;
  isWSL: boolean;
}

export interface ShellResult {
  success: boolean;
  data?: {
    stdout: string;
    stderr: string;
    exitCode: number;
  };
  error?: string;
}

export function useShellStatus() {
  return useQuery<ShellStatus>({
    queryKey: ['shell-status'],
    queryFn: () => apiFetch<ShellStatus>('/api/shell/status'),
  });
}

export function useExecBash() {
  return useMutation({
    mutationFn: (params: {
      projectId: string;
      command: string;
      cwd?: string;
      timeout?: number;
    }) =>
      apiFetch<ShellResult>('/api/shell/bash', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  });
}

export function useExecPowershell() {
  return useMutation({
    mutationFn: (params: {
      projectId: string;
      command: string;
      cwd?: string;
      timeout?: number;
    }) =>
      apiFetch<ShellResult>('/api/shell/powershell', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  });
}
