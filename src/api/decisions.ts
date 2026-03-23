import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface Decision {
  id: string;
  workspaceId: string;
  projectId: string | null;
  agentId: string | null;
  stageId: string | null;
  question: string;
  options: string[] | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export function useDecisions(projectId: string | null) {
  return useQuery<Decision[]>({
    queryKey: ['decisions', projectId],
    queryFn: () =>
      apiFetch<Decision[]>(`/api/decisions?projectId=${projectId}`),
    enabled: !!projectId,
  });
}

export function useResolveDecision(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      decisionId,
      resolution,
      autoDecide,
    }: {
      decisionId: string;
      resolution: string;
      autoDecide?: boolean;
    }) =>
      apiFetch(`/api/decisions/${decisionId}`, {
        method: 'PUT',
        body: JSON.stringify({ resolution, autoDecide }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decisions', projectId] });
    },
  });
}
