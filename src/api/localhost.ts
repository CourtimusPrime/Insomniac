import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface DevServerStatus {
  running: boolean;
  port: number | null;
  pid: number | null;
}

export function useDevServerStatus(projectId: string | null) {
  return useQuery<DevServerStatus>({
    queryKey: ['devServerStatus', projectId],
    queryFn: () =>
      apiFetch<DevServerStatus>(`/api/projects/${projectId}/dev-server/status`),
    enabled: !!projectId,
    refetchInterval: 15_000,
  });
}

export function useStartDevServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) =>
      apiFetch<{ success: boolean; port: number }>(
        `/api/projects/${projectId}/dev-server/start`,
        { method: 'POST' },
      ),
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({
        queryKey: ['devServerStatus', projectId],
      });
    },
  });
}

export function useStopDevServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) =>
      apiFetch<{ success: boolean }>(
        `/api/projects/${projectId}/dev-server/stop`,
        { method: 'POST' },
      ),
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({
        queryKey: ['devServerStatus', projectId],
      });
    },
  });
}
