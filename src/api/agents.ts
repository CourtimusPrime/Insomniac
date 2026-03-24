import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface ActiveAgent {
  id: string;
  name: string;
  role: string | null;
  model: string | null;
  provider: string | null;
  status: 'working' | 'paused' | 'error';
  currentTask: string | null;
  progress: number;
}

export function useActiveAgents() {
  return useQuery<ActiveAgent[]>({
    queryKey: ['activeAgents'],
    queryFn: () => apiFetch<ActiveAgent[]>('/api/agents/active'),
    refetchInterval: 10_000,
  });
}
