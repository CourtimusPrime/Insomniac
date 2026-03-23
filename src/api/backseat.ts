import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface Recommendation {
  id: string;
  type: 'security' | 'performance' | 'quality' | 'coverage' | 'architecture';
  severity: 'critical' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  scannedAt: string | null;
}

export function useRecommendations(projectId: string | null) {
  return useQuery<RecommendationsResponse>({
    queryKey: ['backseat', 'recommendations', projectId],
    queryFn: () =>
      apiFetch<RecommendationsResponse>(
        `/api/backseat/recommendations?projectId=${projectId}`,
      ),
    enabled: !!projectId,
  });
}

export function useScanProject() {
  const queryClient = useQueryClient();
  return useMutation<RecommendationsResponse, Error, string>({
    mutationFn: (projectId: string) =>
      apiFetch<RecommendationsResponse>('/api/backseat/scan', {
        method: 'POST',
        body: JSON.stringify({ projectId }),
      }),
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({
        queryKey: ['backseat', 'recommendations', projectId],
      });
    },
  });
}

export function useRunRecommendation() {
  const queryClient = useQueryClient();
  return useMutation<
    { pipeline: unknown; stageId: string },
    Error,
    { recommendationId: string; projectId: string }
  >({
    mutationFn: ({ recommendationId, projectId }) =>
      apiFetch(`/api/backseat/recommendations/${recommendationId}/run`, {
        method: 'POST',
        body: JSON.stringify({ projectId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}
