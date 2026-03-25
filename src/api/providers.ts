import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export type ProviderName =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'openrouter'
  | 'ollama'
  | 'custom';

export interface Provider {
  id: string;
  workspaceId: string;
  name: ProviderName;
  displayName: string;
  baseUrl: string | null;
  isActive: boolean;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModelDefinition {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  contextWindow: number;
  costPerInputToken: number;
  costPerOutputToken: number;
}

export function useProviders() {
  return useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: () => apiFetch<Provider[]>('/api/providers'),
  });
}

export interface KeyTestResult {
  valid: boolean;
  error?: string;
}

export type ProviderWithKeyTest = Provider & { keyTest?: KeyTestResult };

export function useAddProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      workspaceId: string;
      name: ProviderName;
      displayName: string;
      baseUrl?: string;
      apiKey?: string;
      isActive?: boolean;
    }) =>
      apiFetch<ProviderWithKeyTest>('/api/providers', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      displayName?: string;
      baseUrl?: string;
      apiKey?: string;
      isActive?: boolean;
    }) =>
      apiFetch<ProviderWithKeyTest>(`/api/providers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/providers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useProviderModels(providerId: string | null) {
  return useQuery<ModelDefinition[]>({
    queryKey: ['providerModels', providerId],
    queryFn: () =>
      apiFetch<ModelDefinition[]>(`/api/providers/${providerId}/models`),
    enabled: !!providerId,
  });
}
