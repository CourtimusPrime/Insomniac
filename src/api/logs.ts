import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface LogEntry {
  id: string;
  source: string; // 'orchestrator' | 'agent' | 'system' | 'error'
  level: string; // 'info' | 'warn' | 'error'
  message: string;
  createdAt: string;
}

export function useLogs(search?: string, source?: string) {
  const params = new URLSearchParams();
  params.set('limit', '200');
  if (search) params.set('search', search);
  if (source) params.set('source', source);

  return useQuery<LogEntry[]>({
    queryKey: ['logs', search, source],
    queryFn: () => apiFetch<LogEntry[]>(`/api/logs?${params.toString()}`),
    refetchInterval: 3000,
  });
}
