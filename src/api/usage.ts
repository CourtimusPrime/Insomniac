import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface UsageSummary {
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  mostActiveAgent: string | null;
  mostUsedModel: string | null;
}

export interface UsageTimelineEntry {
  bucket: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  count: number;
}

export interface UsageBreakdownEntry {
  group: string | null;
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  estimatedCost: number;
  count: number;
}

export function useUsageSummary() {
  return useQuery<UsageSummary>({
    queryKey: ['usageSummary'],
    queryFn: () => apiFetch<UsageSummary>('/api/usage/summary'),
    refetchInterval: 5000,
  });
}

export function useUsageTimeline(hours = 24) {
  return useQuery<UsageTimelineEntry[]>({
    queryKey: ['usageTimeline', hours],
    queryFn: () =>
      apiFetch<UsageTimelineEntry[]>(`/api/usage/timeline?hours=${hours}`),
    refetchInterval: 10000,
  });
}

export function useUsageBreakdown(
  groupBy: 'provider' | 'model' | 'agent' | 'project' = 'provider',
) {
  return useQuery<UsageBreakdownEntry[]>({
    queryKey: ['usageBreakdown', groupBy],
    queryFn: () =>
      apiFetch<UsageBreakdownEntry[]>(
        `/api/usage/breakdown?groupBy=${groupBy}`,
      ),
    refetchInterval: 10000,
  });
}
